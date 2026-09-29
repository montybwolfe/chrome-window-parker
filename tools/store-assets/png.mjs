// Just enough PNG handling for the artwork tools: decode 8-bit RGB/RGBA
// screenshots, halve them with a 2×2 box filter, and write opaque RGB (the
// Chrome Web Store wants no alpha in screenshots and promo tiles) or RGBA.
import {inflateSync, deflateSync, crc32} from 'node:zlib';

export function decode(buffer) {
  let offset = 8, width = 0, height = 0, type = 0;
  const data = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset), name = buffer.toString('latin1', offset + 4, offset + 8);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (name === 'IHDR') {
      width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4); type = chunk[9];
      if (chunk[8] !== 8 || ![2, 6].includes(type) || chunk[12] !== 0) throw new Error('Unsupported PNG');
    }
    if (name === 'IDAT') data.push(chunk);
    offset += length + 12;
  }
  const channels = type === 6 ? 4 : 3, stride = width * channels, raw = inflateSync(Buffer.concat(data));
  const pixels = new Uint8Array(width * height * 4), line = new Uint8Array(stride), previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0, b = previous[i], c = i >= channels ? previous[i - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      else if (filter === 2) predictor = b;
      else if (filter === 3) predictor = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = (row[i] + predictor) & 255;
    }
    for (let x = 0; x < width; x++) for (let k = 0; k < 4; k++)
      pixels[(y * width + x) * 4 + k] = k < channels ? line[x * channels + k] : 255;
    previous.set(line);
  }
  return {width, height, pixels};
}

export function halve({width, height, pixels}) {
  const w = width >> 1, h = height >> 1, out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 4; k++) {
    const at = (yy, xx) => pixels[(yy * width + xx) * 4 + k];
    out[(y * w + x) * 4 + k] = (at(2 * y, 2 * x) + at(2 * y, 2 * x + 1) + at(2 * y + 1, 2 * x) + at(2 * y + 1, 2 * x + 1) + 2) >> 2;
  }
  return {width: w, height: h, pixels: out};
}

export function encode({width, height, pixels}, {alpha = false} = {}) {
  const channels = alpha ? 4 : 3, stride = width * channels, raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < width; x++) for (let k = 0; k < channels; k++)
      raw[y * (stride + 1) + 1 + x * channels + k] = pixels[(y * width + x) * 4 + k];
  }
  const chunk = (name, body) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(body.length, 0); head.write(name, 4, 'latin1');
    const tail = Buffer.alloc(4); tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
    return Buffer.concat([head, body, tail]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}

export function info(buffer) {
  return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), alpha: buffer[25] === 6};
}
