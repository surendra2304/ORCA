import { useEffect, useRef } from "react";
import type { FC } from "react";
import { Renderer, Program, Mesh, Triangle, Vec3 } from "ogl";
import type { OGLRenderingContext } from "ogl";

function mergeClasses(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

interface OrbProps {
  className?: string;
  hue?: number;
  enableVoiceControl?: boolean;
  voiceLevel?: number; // External voice level prop (0 to 1)
  voiceSensitivity?: number;
  maxRotationSpeed?: number;
  maxHoverIntensity?: number;
  onVoiceDetected?: (detected: boolean) => void;
}

export const Orb: FC<OrbProps> = ({
  className,
  hue = 0,
  enableVoiceControl = true,
  voiceLevel,
  voiceSensitivity = 1.5,
  maxRotationSpeed = 1.2,
  maxHoverIntensity = 0.8,
  onVoiceDetected,
}) => {
  const ctnDom = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceLevelRef = useRef<number | undefined>(voiceLevel);

  const vert = /* glsl */ `
    precision highp float;
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  // Emerald/Mint color palette fragment shader
  const frag = /* glsl */ `
    precision highp float;

    uniform float iTime;
    uniform vec3 iResolution;
    uniform float hue;
    uniform float hover;
    uniform float rot;
    uniform float hoverIntensity;
    varying vec2 vUv;

    vec3 rgb2yiq(vec3 c) {
      float y = dot(c, vec3(0.299, 0.587, 0.114));
      float i = dot(c, vec3(0.596, -0.274, -0.322));
      float q = dot(c, vec3(0.211, -0.523, 0.312));
      return vec3(y, i, q);
    }

    vec3 yiq2rgb(vec3 c) {
      float r = c.x + 0.956 * c.y + 0.621 * c.z;
      float g = c.x - 0.272 * c.y - 0.647 * c.z;
      float b = c.x - 1.106 * c.y + 1.703 * c.z;
      return vec3(r, g, b);
    }

    vec3 adjustHue(vec3 color, float hueDeg) {
      float hueRad = hueDeg * 3.14159265 / 180.0;
      vec3 yiq = rgb2yiq(color);
      float cosA = cos(hueRad);
      float sinA = sin(hueRad);
      float i = yiq.y * cosA - yiq.z * sinA;
      float q = yiq.y * sinA + yiq.z * cosA;
      yiq.y = i;
      yiq.z = q;
      return yiq2rgb(yiq);
    }

    vec3 hash33(vec3 p3) {
      p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
      p3 += dot(p3, p3.yxz + 19.19);
      return -1.0 + 2.0 * fract(vec3(
        p3.x + p3.y,
        p3.x + p3.z,
        p3.y + p3.z
      ) * p3.zyx);
    }

    float snoise3(vec3 p) {
      const float K1 = 0.333333333;
      const float K2 = 0.166666667;
      vec3 i = floor(p + (p.x + p.y + p.z) * K1);
      vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
      vec3 e = step(vec3(0.0), d0 - d0.yzx);
      vec3 i1 = e * (1.0 - e.zxy);
      vec3 i2 = 1.0 - e.zxy * (1.0 - e);
      vec3 d1 = d0 - (i1 - K2);
      vec3 d2 = d0 - (i2 - K1);
      vec3 d3 = d0 - 0.5;
      vec4 h = max(0.6 - vec4(
        dot(d0, d0),
        dot(d1, d1),
        dot(d2, d2),
        dot(d3, d3)
      ), 0.0);
      vec4 n = h * h * h * h * vec4(
        dot(d0, hash33(i)),
        dot(d1, hash33(i + i1)),
        dot(d2, hash33(i + i2)),
        dot(d3, hash33(i + 1.0))
      );
      return dot(vec4(31.316), n);
    }

    vec4 extractAlpha(vec3 colorIn) {
      float a = max(max(colorIn.r, colorIn.g), colorIn.b);
      return vec4(colorIn.rgb / (a + 1e-5), a);
    }

    // Rethemed emerald palette constants
    const vec3 baseColor1 = vec3(0.055, 0.478, 0.373);   // Emerald #0E7A5F
    const vec3 baseColor2 = vec3(0.082, 0.569, 0.435);   // Lighter mint #15916F
    const vec3 baseColor3 = vec3(0.012, 0.016, 0.016);   // Dark slate/charcoal base
    const vec3 cyanHighlight = vec3(0.373, 0.788, 0.690); // Glint #5FC9B0
    const vec3 warmCopper = vec3(0.063, 0.725, 0.506);    // Vibrant emerald glow #10b981
    const float innerRadius = 0.6;
    const float noiseScale = 0.65;

    float light1(float intensity, float attenuation, float dist) {
      return intensity / (1.0 + dist * attenuation);
    }

    float light2(float intensity, float attenuation, float dist) {
      return intensity / (1.0 + dist * dist * attenuation);
    }

    float solarFlare(vec2 uv, float ang, float len, float time) {
      float flare = 0.0;
      for (float i = 0.0; i < 6.0; i++) {
        float flareAngle = i * 1.047 + time * 0.3;
        float angleDiff = abs(mod(ang - flareAngle + 3.14159, 6.28318) - 3.14159);
        float flareWidth = 0.15 + sin(time * 2.0 + i) * 0.05;
        float angleIntensity = smoothstep(flareWidth, 0.0, angleDiff);
        
        float flareStart = innerRadius + 0.15;
        float flareEnd = flareStart + 0.3 + sin(time * 1.5 + i * 2.0) * 0.15;
        float radialIntensity = smoothstep(flareStart, flareStart + 0.05, len) * smoothstep(flareEnd, flareStart + 0.1, len);
        float flareNoise = snoise3(vec3(ang * 3.0 + i, len * 5.0, time * 0.8 + i)) * 0.5 + 0.5;
        flare += angleIntensity * radialIntensity * flareNoise * 0.7;
      }
      for (float j = 0.0; j < 4.0; j++) {
        float randomAngle = snoise3(vec3(j * 10.0, time * 0.2, 0.0)) * 3.14159;
        float angleDiff = abs(mod(ang - randomAngle + 3.14159, 6.28318) - 3.14159);
        float smallFlareWidth = 0.08;
        float smallAngleIntensity = smoothstep(smallFlareWidth, 0.0, angleDiff);
        
        float smallFlareStart = innerRadius + 0.1;
        float smallFlareEnd = smallFlareStart + 0.15 + sin(time * 3.0 + j * 1.5) * 0.1;
        float smallRadialIntensity = smoothstep(smallFlareStart, smallFlareStart + 0.03, len) * smoothstep(smallFlareEnd, smallFlareStart + 0.05, len);
        flare += smallAngleIntensity * smallRadialIntensity * 0.4;
      }
      return flare;
    }

    vec4 draw(vec2 uv) {
      vec3 color1 = adjustHue(baseColor1, hue);
      vec3 color2 = adjustHue(baseColor2, hue);
      vec3 color3 = adjustHue(baseColor3, hue);

      float ang = atan(uv.y, uv.x);
      float len = length(uv);
      float invLen = len > 0.0 ? 1.0 / len : 0.0;

      float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
      float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
      float d0 = distance(uv, (r0 * invLen) * uv);
      float v0 = light1(1.0, 10.0, d0);
      v0 *= smoothstep(r0 * 1.05, r0, len);
      float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;

      float a = iTime * -1.0;
      vec2 pos = vec2(cos(a), sin(a)) * r0;
      float d = distance(uv, pos);
      float v1 = light2(1.5, 5.0, d);
      v1 *= light1(1.0, 50.0, d0);

      float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
      float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

      float flareIntensity = solarFlare(uv, ang, len, iTime);
      vec3 flareColor = mix(warmCopper, cyanHighlight, sin(ang * 2.0 + iTime) * 0.5 + 0.5);

      float topShine = smoothstep(0.6, -0.2, uv.y) * smoothstep(1.0, 0.3, len);
      float shineNoise = snoise3(vec3(uv * 2.5, iTime * 0.6)) * 0.5 + 0.5;
      float cyanShineIntensity = topShine * shineNoise * 0.5;
      
      float bottomGlow = smoothstep(-0.2, 0.6, uv.y) * smoothstep(1.0, 0.4, len);
      float copperNoise = snoise3(vec3(uv * 2.0 + 10.0, iTime * 0.4)) * 0.5 + 0.5;
      float copperGlowIntensity = bottomGlow * copperNoise * 0.45;
      
      float rimLight = smoothstep(0.45, 0.85, len) * smoothstep(1.0, 0.8, len);
      float rimAngle = ang + iTime * 1.2;
      float cyanRim = rimLight * (sin(rimAngle * 2.0) * 0.5 + 0.5) * 0.4;
      float copperRim = rimLight * (cos(rimAngle * 2.0 + 1.57) * 0.5 + 0.5) * 0.35;

      vec3 col = mix(color1, color2, cl);
      col = mix(color3, col, v0);
      col = (col + v1) * v2 * v3;
      col += flareColor * flareIntensity;
      col = mix(col, cyanHighlight, cyanShineIntensity);
      col += cyanHighlight * cyanRim;
      col = mix(col, warmCopper, copperGlowIntensity);
      col += warmCopper * copperRim;
      col = clamp(col, 0.0, 1.0);

      return extractAlpha(col);
    }

    vec4 mainImage(vec2 fragCoord) {
      vec2 center = iResolution.xy * 0.5;
      float size = min(iResolution.x, iResolution.y);
      vec2 uv = (fragCoord - center) / size * 2.0;

      float angle = rot;
      float s = sin(angle);
      float c = cos(angle);
      uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

      uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
      uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);

      return draw(uv);
    }

    void main() {
      vec2 fragCoord = vUv * iResolution.xy;
      vec4 col = mainImage(fragCoord);
      gl_FragColor = vec4(col.rgb * col.a, col.a);
    }
  `;

  // Internal audio analysis
  const analyzeAudio = () => {
    if (!analyserRef.current || !dataArrayRef.current) return 0;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      const value = dataArrayRef.current[i] / 255;
      sum += value * value;
    }
    const rms = Math.sqrt(sum / dataArrayRef.current.length);
    return Math.min(rms * voiceSensitivity * 3.0, 1);
  };

  const stopMicrophone = () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (microphoneRef.current) {
        microphoneRef.current.disconnect();
        microphoneRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      dataArrayRef.current = null;
    } catch (error) {
      console.warn('Error stopping orb microphone:', error);
    }
  };

  const initMicrophone = async () => {
    try {
      stopMicrophone();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
        },
      });
      mediaStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.3;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
      microphoneRef.current.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      return true;
    } catch (error) {
      console.warn("Orb microphone access denied:", error);
      return false;
    }
  };

  // Keep voiceLevelRef in sync without triggering re-renders
  useEffect(() => {
    voiceLevelRef.current = voiceLevel;
  }, [voiceLevel]);

  useEffect(() => {
    const container = ctnDom.current;
    if (!container) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const targetFPS = isMobile ? 30 : 60;
    const frameInterval = 1000 / targetFPS;
    let lastFrameTime = 0;

    let rendererInstance: Renderer | null = null;
    let glContext: OGLRenderingContext | null = null;
    let rafId: number;
    let program: Program | null = null;

    try {
      rendererInstance = new Renderer({
        alpha: true,
        premultipliedAlpha: false,
        antialias: !isMobile,
        dpr: isMobile ? 1 : (window.devicePixelRatio || 1)
      });
      glContext = rendererInstance.gl;
      glContext.clearColor(0, 0, 0, 0);
      glContext.enable(glContext.BLEND);
      glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(glContext.canvas as HTMLCanvasElement);

      const geometry = new Triangle(glContext);
      program = new Program(glContext, {
        vertex: vert,
        fragment: frag,
        uniforms: {
          iTime: { value: 0 },
          iResolution: {
            value: new Vec3(
              glContext.canvas.width,
              glContext.canvas.height,
              glContext.canvas.width / glContext.canvas.height
            ),
          },
          hue: { value: hue },
          hover: { value: 0 },
          rot: { value: 0 },
          hoverIntensity: { value: 0 },
        },
      });

      const mesh = new Mesh(glContext, { geometry, program });

      const resize = () => {
        if (!container || !rendererInstance || !glContext) return;
        const dpr = window.devicePixelRatio || 1;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) return;

        rendererInstance.setSize(width * dpr, height * dpr);
        const canvas = glContext.canvas as HTMLCanvasElement;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        canvas.style.display = 'block';

        if (program) {
          program.uniforms.iResolution.value.set(
            glContext.canvas.width,
            glContext.canvas.height,
            glContext.canvas.width / glContext.canvas.height
          );
        }
      };
      window.addEventListener("resize", resize);
      resize();

      let lastTime = 0;
      let currentRot = 0;
      let calculatedVoiceLevel = 0;
      const baseRotationSpeed = 0.3;
      let isMicrophoneInitialized = false;

      // Only initialize microphone internally if NO external voiceLevel prop is provided
      const runInternalMic = enableVoiceControl && voiceLevel === undefined;

      if (runInternalMic) {
        initMicrophone().then((success) => {
          isMicrophoneInitialized = success;
        });
      }

      const update = (t: number) => {
        rafId = requestAnimationFrame(update);
        
        if (isMobile) {
          const elapsed = t - lastFrameTime;
          if (elapsed < frameInterval) return;
          lastFrameTime = t - (elapsed % frameInterval);
        }
        
        if (!program) return;

        const dt = (t - lastTime) * 0.001;
        lastTime = t;
        program.uniforms.iTime.value = t * 0.001;
        program.uniforms.hue.value = hue;

        let activeLevel = 0;
        if (voiceLevelRef.current !== undefined) {
          // Driven by external prop (e.g. from useLiveSession)
          activeLevel = Math.min(voiceLevelRef.current * voiceSensitivity, 1);
        } else if (runInternalMic && isMicrophoneInitialized) {
          calculatedVoiceLevel = analyzeAudio();
          activeLevel = calculatedVoiceLevel;
        }

        if (onVoiceDetected) {
          onVoiceDetected(activeLevel > 0.1);
        }

        const voiceRotationSpeed = baseRotationSpeed + (activeLevel * maxRotationSpeed * 2.0);
        if (activeLevel > 0.05 || voiceLevelRef.current !== undefined) {
          currentRot += dt * voiceRotationSpeed;
        } else {
          // Slow passive rotation when idle
          currentRot += dt * baseRotationSpeed;
        }

        program.uniforms.hover.value = Math.min(activeLevel * 2.0, 1.0);
        program.uniforms.hoverIntensity.value = Math.min(activeLevel * maxHoverIntensity * 0.8, maxHoverIntensity);
        program.uniforms.rot.value = currentRot;

        if (rendererInstance && glContext) {
          glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
          rendererInstance.render({ scene: mesh });
        }
      };

      rafId = requestAnimationFrame(update);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", resize);
        if (container && glContext && glContext.canvas) {
          try {
            const canvas = glContext.canvas as HTMLCanvasElement;
            if (container.contains(canvas)) {
              container.removeChild(canvas);
            }
          } catch (e) {}
        }
        stopMicrophone();
        if (glContext) {
          glContext.getExtension("WEBGL_lose_context")?.loseContext();
        }
      };
    } catch (error) {
      console.error("Error initializing Orb:", error);
      return () => {};
    }
  }, [
    hue,
    enableVoiceControl,
    voiceSensitivity,
    maxRotationSpeed,
    maxHoverIntensity,
    vert,
    frag
  ]);

  return (
    <div
      ref={ctnDom}
      className={mergeClasses("relative", className)}
    >
    </div>
  );
};
