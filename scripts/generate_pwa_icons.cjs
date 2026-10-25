const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, pixelFn) {
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Distance from point (x, y) to line segment (x1, y1) -> (x2, y2)
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Cubic Bezier curve distance approximation
function distToBezier(px, py, p0, p1, p2, p3, samples = 30) {
  let minDist = Infinity;
  let prevX = p0.x, prevY = p0.y;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    const curX = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
    const curY = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
    const d = distToSegment(px, py, prevX, prevY, curX, curY);
    if (d < minDist) minDist = d;
    prevX = curX;
    prevY = curY;
  }
  return minDist;
}

function renderPixel(x, y, w, h, isMaskable = false) {
  // Normalize coordinates to [0, 1]
  const nx = x / w;
  const ny = y / h;

  // Background color gradient: dark slate #282826 to #161615
  const bgR = Math.round(40 - ny * 18);
  const bgG = Math.round(40 - ny * 18);
  const bgB = Math.round(38 - ny * 17);

  // If maskable, fill whole area. If standard, round the corners (squircle)
  if (!isMaskable) {
    const cornerR = 0.22;
    const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - cornerR));
    const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - cornerR));
    const distCorner = Math.hypot(dx, dy);
    if (distCorner > cornerR) {
      return [0, 0, 0, 0]; // Transparent outside squircle
    }
  }

  // Scale factor: maskable icons keep content inside center 80% safe zone
  const scale = isMaskable ? 0.72 : 0.88;
  const cx = 0.5;
  const cy = 0.42;
  const px = (nx - cx) / scale + cx;
  const py = (ny - cy) / scale + cy;

  // Reel Center: (0.5, 0.40)
  const reelX = 0.5;
  const reelY = 0.40;
  const reelRadius = 0.22;
  const ringWidth = 0.07;
  const distReelCenter = Math.hypot(px - reelX, py - reelY);

  // Reel Outer Ring
  const ringDist = Math.abs(distReelCenter - reelRadius);
  const inRing = ringDist < (ringWidth / 2);

  // Reel Center Hub
  const inHub = distReelCenter < 0.085;
  const inCenterHole = distReelCenter < 0.032;

  // Reel Apertures (4 small holes)
  const holeR = 0.030;
  const holeDist = 0.145;
  const isHole1 = Math.hypot(px - reelX, py - (reelY - holeDist)) < holeR;
  const isHole2 = Math.hypot(px - reelX, py - (reelY + holeDist)) < holeR;
  const isHole3 = Math.hypot(px - (reelX - holeDist), py - reelY) < holeR;
  const isHole4 = Math.hypot(px - (reelX + holeDist), py - reelY) < holeR;
  const inHole = isHole1 || isHole2 || isHole3 || isHole4;

  // Curve for the "9" descender
  // Starts at (0.5 + reelRadius, reelY) = (0.72, 0.40) and curves down to (0.42, 0.78)
  const p0 = { x: 0.72, y: 0.40 };
  const p1 = { x: 0.72, y: 0.65 };
  const p2 = { x: 0.60, y: 0.80 };
  const p3 = { x: 0.38, y: 0.78 };
  const distCurve = distToBezier(px, py, p0, p1, p2, p3);
  const inTail = distCurve < (ringWidth / 2);

  // Brand Terracotta Gradient (#ea7a53 to #a64728)
  const brandT = Math.max(0, Math.min(1, py));
  const brandR = Math.round(234 - brandT * 68);
  const brandG = Math.round(122 - brandT * 51);
  const brandB = Math.round(83 - brandT * 43);

  // Draw Foreground Elements
  if (inCenterHole || inHole) {
    return [bgR, bgG, bgB, 255];
  }

  if (inHub || inRing || inTail) {
    // Smooth anti-aliased edge
    let edgeDist = 0;
    if (inRing) edgeDist = (ringWidth / 2) - ringDist;
    else if (inTail) edgeDist = (ringWidth / 2) - distCurve;
    else if (inHub) edgeDist = 0.085 - distReelCenter;

    const alpha = Math.min(1, edgeDist * w * 1.5);
    const finalR = Math.round(brandR * alpha + bgR * (1 - alpha));
    const finalG = Math.round(brandG * alpha + bgG * (1 - alpha));
    const finalB = Math.round(brandB * alpha + bgB * (1 - alpha));
    return [finalR, finalG, finalB, 255];
  }

  // Accent Sparkle in top right
  const spX = 0.76;
  const spY = 0.20;
  const spDist = Math.hypot(px - spX, py - spY);
  if (spDist < 0.04) {
    return [253, 251, 247, 240];
  }

  return [bgR, bgG, bgB, 255];
}

const outDir = path.join(__dirname, '../client/public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log('Generating PWA PNG icons...');

// 1. icon-192.png
const png192 = createPng(192, 192, (x, y, w, h) => renderPixel(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'icon-192.png'), png192);

// 2. icon-192-maskable.png
const png192m = createPng(192, 192, (x, y, w, h) => renderPixel(x, y, w, h, true));
fs.writeFileSync(path.join(outDir, 'icon-192-maskable.png'), png192m);

// 3. icon-512.png
const png512 = createPng(512, 512, (x, y, w, h) => renderPixel(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), png512);

// 4. icon-512-maskable.png
const png512m = createPng(512, 512, (x, y, w, h) => renderPixel(x, y, w, h, true));
fs.writeFileSync(path.join(outDir, 'icon-512-maskable.png'), png512m);

// 5. apple-touch-icon.png (180x180)
const appleIcon = createPng(180, 180, (x, y, w, h) => renderPixel(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), appleIcon);

console.log('PWA PNG icons generated successfully:');
console.log(' - icon-192.png (', png192.length, 'bytes)');
console.log(' - icon-192-maskable.png (', png192m.length, 'bytes)');
console.log(' - icon-512.png (', png512.length, 'bytes)');
console.log(' - icon-512-maskable.png (', png512m.length, 'bytes)');
console.log(' - apple-touch-icon.png (', appleIcon.length, 'bytes)');
