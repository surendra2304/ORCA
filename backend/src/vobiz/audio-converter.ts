/**
 * Highly optimized, pure-JavaScript audio conversion utilities.
 * Mu-law (G.711u) 8kHz <-> Linear PCM 16-bit.
 * 
 * Uses pre-computed Lookup Tables (LUTs) for maximum throughput
 * and minimum garbage collection overhead in Node.js V8.
 */

// 1. Mu-law to Linear PCM (16-bit) Lookup Table
const muLawToPcmLookupTable = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  const mu = ~i & 0xff, sign = (mu & 0x80) ? -1 : 1;
  muLawToPcmLookupTable[i] = sign * (((((mu & 0x0f) << 3) + 132) << ((mu >> 4) & 0x07)) - 132);
}

// 2. Linear PCM (16-bit) to Mu-law Lookup Table
// 65536 possible 16-bit PCM values mapped back to 8-bit mu-law
const pcmToMuLawLookupTable = new Uint8Array(65536);
for (let i = -32768; i <= 32767; i++) {
  let s = i < 0 ? -i : i;
  if (s > 32635) s = 32635;
  s += 132;
  let e = 7;
  for (let m = 0x4000; (s & m) === 0 && e > 0; e--, m >>= 1) {}
  pcmToMuLawLookupTable[i & 0xffff] = ~((i < 0 ? 0x80 : 0) | (e << 4) | ((s >> (e + 3)) & 0x0f)) & 0xff;
}

export class AudioConverter {
  /**
   * Converts 8kHz mu-law audio to 16kHz linear PCM (16-bit).
   * Gemini expects 16kHz PCM. We double the samples to resample from 8kHz to 16kHz.
   * @param muLawBuffer The input Buffer containing 8kHz mu-law bytes.
   * @returns A Buffer containing 16kHz 16-bit PCM audio.
   */
  static convert8kHzMuLawTo16kHzPcm(muBuf: Buffer): Buffer {
    const len = muBuf.length, pcmBuf = Buffer.allocUnsafe(len * 4);
    for (let i = 0; i < len; i++) {
      const val = muLawToPcmLookupTable[muBuf[i]];
      pcmBuf.writeInt16LE(val, i * 4); pcmBuf.writeInt16LE(val, i * 4 + 2);
    }
    return pcmBuf;
  }

  /**
   * Converts linear PCM (16-bit) to 8kHz mu-law.
   * Downsamples the input stream (e.g. 16kHz or 24kHz) to 8kHz by skipping samples.
   * 
   * @param pcmBuffer The input Buffer containing 16-bit PCM audio.
   * @param inputSampleRate The sample rate of the input PCM audio (e.g., 16000 or 24000)
   * @returns A Buffer containing 8kHz mu-law bytes.
   */
  static convertPcmTo8kHzMuLaw(pcmBuf: Buffer, inputRate: number = 24000): Buffer {
    const factor = inputRate / 8000, outLen = Math.floor(pcmBuf.length / 2 / factor);
    const muBuf = Buffer.allocUnsafe(outLen);
    let outIdx = 0;
    for (let i = 0; i < outLen; i++) {
      const srcIdx = Math.floor(i * factor);
      if (srcIdx * 2 >= pcmBuf.length) break;
      muBuf[outIdx++] = pcmToMuLawLookupTable[pcmBuf.readInt16LE(srcIdx * 2) & 0xffff];
    }
    return outIdx === outLen ? muBuf : muBuf.subarray(0, outIdx);
  }
}
