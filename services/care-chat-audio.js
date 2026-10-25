const MAX_SECONDS = 60;
const MAX_BYTES = 44 + 48000 * 2 * MAX_SECONDS;

// Accept only the exact uncompressed mono PCM format emitted by our recorder.
// Duration comes from actual sample bytes, never a posted duration or metadata.
function inspectVoiceWav(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44 || buffer.length > MAX_BYTES ||
      buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.readUInt32LE(4) !== buffer.length - 8 ||
      buffer.toString('ascii', 8, 12) !== 'WAVE' || buffer.toString('ascii', 12, 16) !== 'fmt ' ||
      buffer.readUInt32LE(16) !== 16 || buffer.readUInt16LE(20) !== 1 || buffer.readUInt16LE(22) !== 1 ||
      buffer.readUInt16LE(32) !== 2 || buffer.readUInt16LE(34) !== 16 ||
      buffer.toString('ascii', 36, 40) !== 'data' || buffer.readUInt32LE(40) !== buffer.length - 44 ||
      (buffer.length - 44) % 2 !== 0) throw Error('invalid_voice_audio');
  const rate = buffer.readUInt32LE(24), frames = (buffer.length - 44) / 2;
  if (![16000, 22050, 24000, 32000, 44100, 48000].includes(rate) || buffer.readUInt32LE(28) !== rate * 2)
    throw Error('invalid_voice_audio');
  const duration = frames / rate;
  if (duration < 0.5 || duration > MAX_SECONDS) throw Error('voice_duration_invalid');
  let energy = 0;
  for (let i = 44; i < buffer.length; i += 2) { const value = buffer.readInt16LE(i) / 32768; energy += value * value; }
  if (Math.sqrt(energy / frames) < 0.001) throw Error('speech_not_clear');
  return { durationSeconds: duration, sampleRate: rate };
}
module.exports = { inspectVoiceWav, MAX_SECONDS, MAX_BYTES };
