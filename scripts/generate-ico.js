/**
 * Generate app.ico for FlowDan
 * Creates a valid Windows ICO file with 16x16, 32x32, 48x48 sizes
 * Indigo circle matching the tray icon style
 */
const fs = require('fs');
const path = require('path');

function generatePixels(size) {
  // Generate BGRA pixel data (bottom-up for BMP)
  const pixels = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size / 2 - 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // ICO BMP is bottom-up: first row in buffer = bottom row of image
      const srcY = size - 1 - y;
      const idx = (y * size + x) * 4;

      const dx = x - center + 0.5;
      const dy = srcY - center + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius - 0.5) {
        // Fully inside circle - indigo (BGRA)
        pixels[idx] = 241;     // B
        pixels[idx + 1] = 102; // G
        pixels[idx + 2] = 99;  // R
        pixels[idx + 3] = 255; // A
      } else if (dist < radius + 0.5) {
        // Anti-aliased edge
        const alpha = Math.max(0, Math.min(1, radius + 0.5 - dist));
        pixels[idx] = 241;
        pixels[idx + 1] = 102;
        pixels[idx + 2] = 99;
        pixels[idx + 3] = Math.round(alpha * 255);
      } else {
        // Outside - transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  return pixels;
}

function createAndMask(size) {
  // 1 bit per pixel, rows padded to 4 bytes. All 0 = all opaque (alpha channel used instead)
  const rowBytes = Math.ceil(size / 8);
  const paddedRowBytes = Math.ceil(rowBytes / 4) * 4;
  return Buffer.alloc(paddedRowBytes * size, 0);
}

function createBmpEntry(size) {
  const pixels = generatePixels(size);
  const andMask = createAndMask(size);

  // BITMAPINFOHEADER (40 bytes)
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);           // biSize
  header.writeInt32LE(size, 4);          // biWidth
  header.writeInt32LE(size * 2, 8);      // biHeight (double for AND mask)
  header.writeUInt16LE(1, 12);           // biPlanes
  header.writeUInt16LE(32, 14);          // biBitCount
  header.writeUInt32LE(0, 16);           // biCompression
  header.writeUInt32LE(pixels.length + andMask.length, 20); // biSizeImage

  return Buffer.concat([header, pixels, andMask]);
}

// Generate ICO with multiple sizes
const sizes = [16, 32, 48];
const entries = sizes.map(s => createBmpEntry(s));

// ICO Header (6 bytes)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);            // Reserved
icoHeader.writeUInt16LE(1, 2);            // Type: ICO
icoHeader.writeUInt16LE(sizes.length, 4); // Image count

// Directory entries (16 bytes each)
const dirEntrySize = 16;
const headerSize = 6;
const dirSize = headerSize + dirEntrySize * sizes.length;

let offset = dirSize;
const dirEntries = sizes.map((size, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size < 256 ? size : 0, 0);  // Width
  entry.writeUInt8(size < 256 ? size : 0, 1);  // Height
  entry.writeUInt8(0, 2);                        // Color count (0 = 32-bit)
  entry.writeUInt8(0, 3);                        // Reserved
  entry.writeUInt16LE(1, 4);                     // Planes
  entry.writeUInt16LE(32, 6);                    // Bit count
  entry.writeUInt32LE(entries[i].length, 8);     // Data size
  entry.writeUInt32LE(offset, 12);               // Data offset

  offset += entries[i].length;
  return entry;
});

const ico = Buffer.concat([icoHeader, ...dirEntries, ...entries]);

// Write file
const outDir = path.join(__dirname, '..', 'assets', 'icons');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'app.ico');
fs.writeFileSync(outPath, ico);

console.log(`Created ${outPath} (${ico.length} bytes) with sizes: ${sizes.join('x, ')}x`);
