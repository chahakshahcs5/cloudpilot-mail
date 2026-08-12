/**
 * Generate PNG icons from SVG for the extension manifest.
 * Uses the canvas approach via a simple node script.
 * Since we can't easily use canvas in Node without native deps,
 * we'll create simple colored PNG icons directly.
 */
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, 'icons');

// Simple 1x1 PNG header approach won't work for multi-size.
// Instead, let's create a minimal valid PNG for each size with our brand gradient.
// We'll use a simple bitmap approach.

function createPng(size: number): Buffer {
  // Create raw RGBA pixel data
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const t = (x + y) / (size * 2); // gradient factor

      // Blue to violet gradient
      const r = Math.round(59 + (139 - 59) * t);
      const g = Math.round(130 + (92 - 130) * t);
      const b = Math.round(246 + (246 - 246) * t);

      // Round corners
      const cx = size / 2, cy = size / 2;
      const cornerRadius = size * 0.22;
      let alpha = 255;

      // Simple rounded rect check
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const half = size / 2;
      const inset = half - cornerRadius;

      if (dx > inset && dy > inset) {
        const dist = Math.sqrt((dx - inset) ** 2 + (dy - inset) ** 2);
        if (dist > cornerRadius) alpha = 0;
        else if (dist > cornerRadius - 1) alpha = Math.round(255 * (cornerRadius - dist));
      } else if (dx > half || dy > half) {
        alpha = 0;
      }

      // Draw a simple white envelope shape in the center (centered vertically at 50%)
      const envTop = size * 0.31;
      const envBottom = size * 0.69;
      const envLeft = size * 0.20;
      const envRight = size * 0.80;
      const envMidY = size * 0.48;

      if (alpha > 0 && x >= envLeft && x <= envRight && y >= envTop && y <= envBottom) {
        // Inside envelope rectangle
        const envR = 255, envG = 255, envB = 255, envA = Math.round(alpha * 0.95);

        // V-flap line
        const flapCenterX = size / 2;
        const slopeLeft = (envMidY - envTop) / (flapCenterX - envLeft);
        const slopeRight = (envMidY - envTop) / (envRight - flapCenterX);

        let onFlap = false;
        if (x <= flapCenterX) {
          const flapY = envTop + slopeLeft * (x - envLeft);
          if (Math.abs(y - flapY) < size * 0.03) onFlap = true;
        } else {
          const flapY = envTop + slopeRight * (envRight - x);
          if (Math.abs(y - flapY) < size * 0.03) onFlap = true;
        }

        if (onFlap) {
          // Draw flap line in gradient color
          pixels[idx] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = b;
          pixels[idx + 3] = alpha;
        } else {
          pixels[idx] = envR;
          pixels[idx + 1] = envG;
          pixels[idx + 2] = envB;
          pixels[idx + 3] = envA;
        }
      } else {
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = alpha;
      }
    }
  }

  // Encode as PNG (minimal encoder)
  return encodePng(size, size, pixels);
}

// Minimal PNG encoder
function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const crc32Table = makeCrc32Table();

  function crc32(data: Uint8Array): number {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      c = crc32Table[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function makeCrc32Table(): Uint32Array {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
        else c = c >>> 1;
      }
      table[n] = c;
    }
    return table;
  }

  // Create raw scanlines (filter type 0 = None)
  const rawLen = height * (1 + width * 4);
  const raw = new Uint8Array(rawLen);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter byte
    for (let x = 0; x < width * 4; x++) {
      raw[y * (1 + width * 4) + 1 + x] = rgba[y * width * 4 + x];
    }
  }

  // Deflate using raw stored blocks (no compression for simplicity)
  const deflated = deflateStored(raw);

  // Build chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type: string, data: Uint8Array): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBytes = Buffer.from(type, 'ascii');
    const combined = Buffer.concat([typeBytes, Buffer.from(data)]);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, combined, checksum]);
  }

  // IHDR
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, width);
  new DataView(ihdr.buffer).setUint32(4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', new Uint8Array(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function deflateStored(data: Uint8Array): Uint8Array {
  // Zlib header + stored deflate blocks
  const blocks: Uint8Array[] = [];
  const maxBlock = 65535;

  // Zlib header: CMF=0x78, FLG=0x01 (no dict, level 0)
  blocks.push(new Uint8Array([0x78, 0x01]));

  for (let i = 0; i < data.length; i += maxBlock) {
    const remaining = data.length - i;
    const blockLen = Math.min(remaining, maxBlock);
    const isLast = (i + blockLen >= data.length);

    const header = new Uint8Array(5);
    header[0] = isLast ? 1 : 0;
    header[1] = blockLen & 0xFF;
    header[2] = (blockLen >> 8) & 0xFF;
    header[3] = (~blockLen) & 0xFF;
    header[4] = ((~blockLen) >> 8) & 0xFF;

    blocks.push(header);
    blocks.push(data.subarray(i, i + blockLen));
  }

  // Adler32 checksum
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = new Uint8Array(4);
  adler[0] = (b >> 8) & 0xFF;
  adler[1] = b & 0xFF;
  adler[2] = (a >> 8) & 0xFF;
  adler[3] = a & 0xFF;
  blocks.push(adler);

  const totalLen = blocks.reduce((s, b) => s + b.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const block of blocks) {
    result.set(block, offset);
    offset += block.length;
  }
  return result;
}

// Generate icons
for (const size of [16, 32, 48, 128]) {
  const png = createPng(size);
  writeFileSync(resolve(iconsDir, `icon${size}.png`), png);
  console.log(`✓ Generated icon${size}.png`);
}
