// The browser converts uploads/recordings to bounded mono PCM WAV before transmission.
// Parse chunk sizes rather than trusting a filename, MIME type or client duration.
function wavDuration(buffer) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  )
    return null;
  if (buffer.readUInt32LE(4) + 8 !== buffer.length) return null;
  let format = null,
    data = null,
    offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4),
      size = buffer.readUInt32LE(offset + 4),
      start = offset + 8;
    if (size > buffer.length - start) return null;
    if (id === "fmt ") {
      if (size < 16 || format) return null;
      format = {
        encoding: buffer.readUInt16LE(start),
        channels: buffer.readUInt16LE(start + 2),
        rate: buffer.readUInt32LE(start + 4),
        byteRate: buffer.readUInt32LE(start + 8),
        align: buffer.readUInt16LE(start + 12),
        bits: buffer.readUInt16LE(start + 14),
      };
    }
    if (id === "data") {
      if (data !== null) return null;
      data = size;
    }
    offset = start + size + (size % 2);
  }
  if (offset !== buffer.length || !format || data === null) return null;
  const f = format;
  if (
    f.encoding !== 1 ||
    f.channels !== 1 ||
    f.bits !== 16 ||
    f.rate < 8000 ||
    f.rate > 48000 ||
    f.align !== 2 ||
    f.byteRate !== f.rate * 2 ||
    data % 2
  )
    return null;
  return data / f.byteRate;
}
module.exports = { wavDuration };
