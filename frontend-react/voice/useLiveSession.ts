import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { api } from '../api';
import { createBlob, decode, decodeAudioData } from './audioUtils';

export const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
} as const;

export type ConnectionState = typeof ConnectionState[keyof typeof ConnectionState];

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  isFinal: boolean;
}

const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 512; // ~32ms at 16kHz
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.index++] = channel[i];
      if (this.index >= this.bufferSize) {
        this.port.postMessage({ type: 'audio', data: this.buffer });
        this.buffer = new Float32Array(this.bufferSize);
        this.index = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

export function useLiveSession() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);

  const sessionRef = useRef<any>(null);
  const connectionStateRef = useRef<ConnectionState>(ConnectionState.DISCONNECTED);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const inputWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeAudioNodesRef = useRef<AudioBufferSourceNode[]>([]);

  // Accumulated live transcripts
  const currentInputTxRef = useRef<string>('');
  const currentOutputTxRef = useRef<string>('');

  // Keeps track of mount state to avoid double-mount initialization errors
  const isMountedRef = useRef(true);

  // Active session details for transparent resumption
  const activeAgentIdRef = useRef<string | null>(null);
  const isPublicRef = useRef<boolean>(false);
  const workspacePublicKeyRef = useRef<string | undefined>(undefined);
  const lastResumptionHandleRef = useRef<string | null>(null);
  const reconnectCountRef = useRef<number>(0);
  const refreshTimeoutRef = useRef<any>(null);
  const isReconnectingRef = useRef<boolean>(false);
  const kbCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateConnectionState = (state: ConnectionState) => {
    connectionStateRef.current = state;
    setConnectionState(state);
  };

  const updateLatestMessage = (role: 'user' | 'model', content: string, isFinal: boolean) => {
    setMessages((prev) => {
      const newMsgs = [...prev];
      const index = [...newMsgs].reverse().findIndex(m => m.role === role && !m.isFinal);
      
      if (index !== -1) {
        newMsgs[newMsgs.length - 1 - index] = { role, content, isFinal };
        return newMsgs;
      }
      return [...prev, { role, content, isFinal }];
    });
  };

  const playPCMChunk = async (base64PCM: string) => {
    try {
      const bytes = decode(base64PCM);

      let ctx = playbackAudioContextRef.current;
      if (!ctx || ctx.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioContextClass();
        playbackAudioContextRef.current = ctx;
        nextPlayTimeRef.current = 0;
      }

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const buffer = await decodeAudioData(bytes, ctx, 24000, 1);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      source.onended = () => {
        activeAudioNodesRef.current = activeAudioNodesRef.current.filter(n => n !== source);
      };
      activeAudioNodesRef.current.push(source);

      const now = ctx.currentTime;
      if (nextPlayTimeRef.current < now) {
        nextPlayTimeRef.current = now;
      }
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += buffer.duration;
    } catch (e) {
      console.error('[Playback] Error playing PCM chunk:', e);
    }
  };

  const disconnect = useCallback(() => {
    console.log('[useLiveSession] Disconnecting active session...');
    
    if (inputWorkletNodeRef.current) {
      try { inputWorkletNodeRef.current.disconnect(); } catch (e) {}
      inputWorkletNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioContextRef.current) {
      if (inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close().catch(() => {});
      }
      inputAudioContextRef.current = null;
    }

    if (playbackAudioContextRef.current) {
      if (playbackAudioContextRef.current.state !== 'closed') {
        playbackAudioContextRef.current.close().catch(() => {});
      }
      playbackAudioContextRef.current = null;
    }

    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    lastResumptionHandleRef.current = null;
    reconnectCountRef.current = 0;

    updateConnectionState(ConnectionState.DISCONNECTED);
    setIsBotSpeaking(false);
    setMicrophoneLevel(0);
    currentInputTxRef.current = '';
    currentOutputTxRef.current = '';
  }, []);

  const closeSessionOnly = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
  }, []);

  const startSession = async (
    agentId: string,
    isPublic = false,
    workspacePublicKey?: string,
    resumptionHandle?: string
  ) => {
    if (!isReconnectingRef.current && (connectionStateRef.current === ConnectionState.CONNECTING || connectionStateRef.current === ConnectionState.CONNECTED)) {
      console.log('[useLiveSession] Already active, skipping connection.');
      return;
    }

    try {
      updateConnectionState(ConnectionState.CONNECTING);
      setError(null);
      if (!resumptionHandle) {
        setMessages([]);
      }
      nextPlayTimeRef.current = 0;
      activeAudioNodesRef.current.forEach(node => {
        try { node.stop(); } catch (e) {}
      });
      activeAudioNodesRef.current = [];
      currentInputTxRef.current = '';
      currentOutputTxRef.current = '';
      kbCacheRef.current.clear();

      // 1. Fetch ephemeral token from backend
      const tokenUrl = isPublic ? '/public/voice/token' : '/voice/token';
      const tokenBody: any = { agentId };
      if (isPublic) {
        tokenBody.workspacePublicKey = workspacePublicKey;
      }
      if (resumptionHandle) {
        tokenBody.resumptionHandle = resumptionHandle;
      }
      const { token, model, expireTime } = await api.post(tokenUrl, tokenBody);

      if (!isMountedRef.current) return;

      activeAgentIdRef.current = agentId;
      isPublicRef.current = isPublic;
      workspacePublicKeyRef.current = workspacePublicKey;

      // Token TTL guard: trigger transparent resumption before token expires
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (expireTime) {
        const msToExpiration = new Date(expireTime).getTime() - Date.now();
        const refreshBufferMs = 60 * 1000; // 1 minute buffer
        const delay = msToExpiration - refreshBufferMs;
        if (delay > 0) {
          refreshTimeoutRef.current = setTimeout(() => {
            console.log('[useLiveSession] Token is approaching expiration. Refreshing session transparently...');
            triggerTransparentResume();
          }, delay);
        }
      }

      // 2. Initialize Web Audio (Input context at 16kHz for mic, reuse if active)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      let inputCtx = inputAudioContextRef.current;
      if (!inputCtx || inputCtx.state === 'closed') {
        inputCtx = new AudioContextClass({ sampleRate: 16000 });
        inputAudioContextRef.current = inputCtx;
      }

      let playbackCtx = playbackAudioContextRef.current;
      if (!playbackCtx || playbackCtx.state === 'closed') {
        playbackCtx = new AudioContextClass();
        playbackAudioContextRef.current = playbackCtx;
      }
      if (playbackCtx.state === 'suspended') {
        await playbackCtx.resume();
      }

      // 3. Load AudioWorklet from blob
      try {
        const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        await inputCtx.audioWorklet.addModule(workletUrl);
      } catch (e) {
        console.log('[useLiveSession] Worklet already added or failed to add:', e);
      }

      // 4. Request mic access (reuse if active)
      let stream = mediaStreamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }

      // 5. Initialize client and connect
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' }
      });

      const session = await ai.live.connect({
        model,
        config: resumptionHandle ? {
          sessionResumption: { handle: resumptionHandle }
        } : undefined,
        callbacks: {
          onopen: () => {
            console.log('[Session] Live Session opened');
            updateConnectionState(ConnectionState.CONNECTED);
            reconnectCountRef.current = 0; // Reset retry counter on success

            // Connect Mic to Worklet
            if (inputAudioContextRef.current && mediaStreamRef.current) {
              const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
              const workletNode = new AudioWorkletNode(inputAudioContextRef.current, 'pcm-processor');

              workletNode.port.onmessage = (e) => {
                if (connectionStateRef.current !== ConnectionState.CONNECTED) return;

                const message = e.data;
                if (message.type === 'audio') {
                  const inputData = message.data as Float32Array;

                  // Compute real-time microphone RMS level to drive visual Orb
                  const rms = Math.sqrt(inputData.reduce((acc, val) => acc + val * val, 0) / inputData.length);
                  setMicrophoneLevel(rms);

                  const pcmBlob = createBlob(inputData);
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch (err: any) {
                    if (!err.message?.includes('CLOSING') && !err.message?.includes('CLOSED')) {
                      console.warn('[Session] Audio send error:', err);
                    }
                  }
                }
              };

              source.connect(workletNode);
              workletNode.connect(inputAudioContextRef.current.destination);
              inputWorkletNodeRef.current = workletNode;
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Session Resumption Update (only log valid resumable handles)
            if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate?.newHandle) {
              const { newHandle } = message.sessionResumptionUpdate;
              console.log('[Session] Received session resumption update. New handle:', newHandle);
              lastResumptionHandleRef.current = newHandle;
            }

            // Handle Interruption / Barge-in
            if (message.serverContent?.interrupted) {
              console.log('[Session] Interruption detected - stopping bot playback');

              // Stop all currently playing audio nodes instantly
              activeAudioNodesRef.current.forEach(node => {
                try { node.stop(); } catch (e) {}
              });
              activeAudioNodesRef.current = [];

              // Reset queue time to now so new speech starts immediately
              if (playbackAudioContextRef.current) {
                nextPlayTimeRef.current = playbackAudioContextRef.current.currentTime;
              }

              setIsBotSpeaking(false);
              currentOutputTxRef.current = '';

              // Finalize message turn in UI
              setMessages((prev) => {
                const newMsgs = [...prev];
                const index = [...newMsgs].reverse().findIndex(m => m.role === 'model' && !m.isFinal);
                if (index !== -1) {
                  newMsgs[newMsgs.length - 1 - index] = { ...newMsgs[newMsgs.length - 1 - index], isFinal: true };
                }
                return newMsgs;
              });
            }

            // Handle RAG Tool Call Loop
            if (message.toolCall?.functionCalls) {
              for (const functionCall of message.toolCall.functionCalls) {
                const { name, args } = functionCall;
                if (name === 'query_knowledge_base') {
                  const query = (args as any).query;
                  console.log('[Session] Tool query_knowledge_base triggered:', query);

                  let responseText = 'No specific information was found in the guidelines.';

                  if (kbCacheRef.current.has(query)) {
                    responseText = kbCacheRef.current.get(query)!;
                    console.log('[Session] Served KB query from in-memory cache');
                  } else {
                    try {
                      const kbUrl = isPublic ? '/kb/public/query' : '/kb/query';
                      const currentAgentId = activeAgentIdRef.current;
                      const kbBody = isPublic
                        ? { q: query, workspacePublicKey, agentId: currentAgentId }
                        : { q: query, agentId: currentAgentId };
                      
                      const controller = new AbortController();
                      const timeoutId = setTimeout(() => controller.abort(), 3000);

                      const result = await api.post(kbUrl, kbBody, { signal: controller.signal });
                      clearTimeout(timeoutId);
                      
                      if (result && result.context) {
                        responseText = result.context;
                        kbCacheRef.current.set(query, responseText);
                      }
                    } catch (err) {
                      console.error('[Session] Tool call failed or timed out:', err);
                    }
                  }

                  // Send response back
                  try {
                    await session.sendToolResponse({
                      functionResponses: [{
                        id: functionCall.id,
                        name: name,
                        response: { result: responseText }
                      }]
                    });
                  } catch (err) {
                    console.error('[Session] Failed to send tool response:', err);
                  }
                }
              }
            }

            // Handle Audio Playback
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
                  const pcmData = part.inlineData.data;
                  if (pcmData) {
                    setIsBotSpeaking(true);
                    playPCMChunk(pcmData);
                  }
                }
              }
            }

            // Handle Transcripts (User Input)
            const inputTx = message.serverContent?.inputTranscription;
            if (inputTx?.text) {
              currentInputTxRef.current += inputTx.text;
              updateLatestMessage('user', currentInputTxRef.current, false);
            }

            // Handle Transcripts (Model Output)
            const outputTx = message.serverContent?.outputTranscription;
            if (outputTx?.text) {
              const textChunk = outputTx.text.replace(/[\*\[\]]/g, '');
              currentOutputTxRef.current += textChunk;
              updateLatestMessage('model', currentOutputTxRef.current, false);
            }

            // Handle Turn Complete
            if (message.serverContent?.turnComplete) {
              setIsBotSpeaking(false);

              if (currentInputTxRef.current) {
                updateLatestMessage('user', currentInputTxRef.current, true);
                currentInputTxRef.current = '';
              }
              if (currentOutputTxRef.current) {
                updateLatestMessage('model', currentOutputTxRef.current, true);
                currentOutputTxRef.current = '';
              }
            }
          },
          onclose: (event) => {
            console.log('[Session] Live Session closed:', event);
            if (isReconnectingRef.current) {
              console.log('[Session] Connection closed for reconnection. Skipping full teardown.');
              return;
            }
            
            // If we have a resumption handle, try to reconnect automatically
            if (lastResumptionHandleRef.current && reconnectCountRef.current < 3) {
              reconnectCountRef.current += 1;
              console.log(`[Session] Unexpected close. Attempting auto-resumption (attempt ${reconnectCountRef.current}/3)...`);
              triggerTransparentResume();
            } else {
              disconnect();
            }
          },
          onerror: (err) => {
            console.error('[Session] Live Session error:', err);
            setError(err.message || 'Connection error');
            updateConnectionState(ConnectionState.ERROR);
            disconnect();
          }
        }
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error('[useLiveSession] Start session error:', err);
      setError(err.message || 'Failed to start voice call');
      updateConnectionState(ConnectionState.ERROR);
      disconnect();
    }
  };

  const triggerTransparentResume = async () => {
    const agentId = activeAgentIdRef.current;
    const isPublic = isPublicRef.current;
    const workspacePublicKey = workspacePublicKeyRef.current;
    const handle = lastResumptionHandleRef.current;

    if (!agentId) return;

    isReconnectingRef.current = true;
    updateConnectionState(ConnectionState.CONNECTING);
    
    closeSessionOnly();
    
    try {
      await startSession(agentId, isPublic, workspacePublicKey, handle || undefined);
    } catch (err) {
      console.error('[useLiveSession] Transparent reconnection failed:', err);
      isReconnectingRef.current = false;
      disconnect();
    } finally {
      isReconnectingRef.current = false;
    }
  };

  return {
    connectionState,
    messages,
    error,
    isBotSpeaking,
    microphoneLevel,
    startSession,
    disconnect,
  };
}
