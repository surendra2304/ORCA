export function mixAudioToWav(
  durationSec: number,
  userChunks: { pcmBase64: string; offsetMs: number }[],
  agentChunks: { pcmBase64: string; offsetMs: number }[]
): Buffer {
  // Target format: 24000 Hz, 16-bit, Stereo (2 channels)
  // Left channel: User
  // Right channel: Agent
  const sampleRate = 24000, numChannels = 2, bytesPerSample = 2;
  const maxSample = Math.max(durationSec, 1) * sampleRate;
  const totalSamples = maxSample + sampleRate; // +1s safety buffer
  const userMixer = new Int32Array(totalSamples), agentMixer = new Int32Array(totalSamples);

  let uNext = 0;
  for (const c of userChunks) {
    const buf = Buffer.from(c.pcmBase64, 'base64'), len = Math.floor(buf.length / 2);
    let start = Math.max(Math.floor((c.offsetMs / 1000) * sampleRate), uNext);
    for (let i = 0; i < len; i++) {
      const v = buf.readInt16LE(i * 2);
      for (let j = 0; j < 3; j++) if (start + i * 3 + j < totalSamples) userMixer[start + i * 3 + j] += v;
    }
    uNext = start + len * 3;
  }

  let aNext = 0;
  for (const c of agentChunks) {
    const buf = Buffer.from(c.pcmBase64, 'base64'), len = Math.floor(buf.length / 2);
    let start = Math.max(Math.floor((c.offsetMs / 1000) * sampleRate), aNext);
    for (let i = 0; i < len; i++) {
      if (start + i < totalSamples) agentMixer[start + i] += Math.floor(buf.readInt16LE(i * 2) * 2.5);
    }
    aNext = start + len;
  }

  const size = totalSamples * numChannels * bytesPerSample, audioData = Buffer.alloc(size);
  for (let i = 0; i < totalSamples; i++) {
    audioData.writeInt16LE(Math.max(-32768, Math.min(32767, userMixer[i])), i * 4);
    audioData.writeInt16LE(Math.max(-32768, Math.min(32767, agentMixer[i])), i * 4 + 2);
  }

  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + size, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(numChannels, 22);
  head.writeUInt32LE(sampleRate, 24); head.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  head.writeUInt16LE(numChannels * bytesPerSample, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(size, 40);

  return Buffer.concat([head, audioData]);
}
