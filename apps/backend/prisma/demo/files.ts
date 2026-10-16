/**
 * Demo timeline -- synthetic document rendering.
 *
 * PDFs use pdfkit (already a backend dependency, the same library that
 * renders prescription PDFs); PNG "photos" and SPECIMEN identity cards use a
 * tiny built-in encoder (node:zlib) so no image library is added. Every file
 * is visibly marked as synthetic.
 */
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';

import PDFDocument from 'pdfkit';

import type { DocumentRender } from './plan/types.js';

export const SYNTHETIC_MARK = 'SYNTHETIC DEMO DOCUMENT - NOT A REAL MEDICAL RECORD';
export const SPECIMEN_MARK = 'SPECIMEN - NOT A REAL ID';

/** Stable fingerprint of what a file should contain (stored as object metadata to skip unchanged uploads). */
export function renderFingerprint(render: DocumentRender): string {
  return createHash('sha256').update(JSON.stringify(render)).digest('hex').slice(0, 32);
}

export async function renderDocument(render: DocumentRender): Promise<{ body: Buffer; contentType: 'application/pdf' | 'image/png' }> {
  if (render.kind === 'image' || render.kind === 'identity') {
    return { body: renderPng(render), contentType: 'image/png' };
  }
  return { body: await renderPdf(render), contentType: 'application/pdf' };
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
const fmtDate = (date: Date): string => date.toISOString().slice(0, 10);

async function renderPdf(render: Exclude<DocumentRender, { kind: 'image' } | { kind: 'identity' }>): Promise<Buffer> {
  const date = render.kind === 'lab-report' ? render.reportedOn : render.date;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 56,
    info: { Title: titleOf(render), Author: 'ORIVEX demo data', Producer: 'ORIVEX demo data', CreationDate: date, ModDate: date },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // Watermark band.
  doc.save().rect(0, 0, doc.page.width, 30).fill('#B42318').restore();
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text(SYNTHETIC_MARK, 56, 10, { width: doc.page.width - 112, align: 'center' });
  doc.save().rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
  doc.fillColor('#B42318').opacity(0.08).font('Helvetica-Bold').fontSize(54).text('SYNTHETIC DEMO', 60, doc.page.height / 2 - 40, { width: doc.page.width - 120, align: 'center' });
  doc.restore().opacity(1);

  doc.fillColor('#101828').font('Helvetica-Bold').fontSize(18).text(titleOf(render), 56, 60);
  doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor('#667085').text('Generated for the ORIVEX demo environment. All names, values and dates are fictional.');
  doc.moveDown(1).fillColor('#101828').fontSize(11);

  if (render.kind === 'lab-report') {
    field(doc, 'Patient', render.patientName);
    if (render.patientDob) field(doc, 'Date of birth', render.patientDob);
    field(doc, 'Requested by', render.doctorName);
    field(doc, 'Test', render.test);
    field(doc, 'Collected', fmtDate(render.collectedOn));
    field(doc, 'Reported', fmtDate(render.reportedOn));
    doc.moveDown(1);
    const top = doc.y;
    const columns = [56, 250, 330, 400, 500];
    doc.font('Helvetica-Bold').fontSize(10);
    ['Analyte', 'Result', 'Unit', 'Reference range', 'Flag'].forEach((label, index) => doc.text(label, columns[index], top));
    doc.moveTo(56, top + 14).lineTo(doc.page.width - 56, top + 14).strokeColor('#D0D5DD').stroke();
    doc.font('Helvetica').fontSize(10);
    let y = top + 22;
    for (const result of render.results) {
      doc.fillColor(result.flag ? '#B42318' : '#101828');
      [result.analyte, result.value, result.unit, result.range, result.flag ?? ''].forEach((value, index) => doc.text(value, columns[index], y, { width: (columns[index + 1] ?? doc.page.width - 56) - columns[index] - 6 }));
      y += 20;
    }
    doc.fillColor('#667085').fontSize(9).text('Flags: H = above reference range, L = below reference range. Partner laboratory (fictional).', 56, y + 16);
  } else if (render.kind === 'referral-letter') {
    field(doc, 'Date', fmtDate(render.date));
    field(doc, 'To', render.to);
    field(doc, 'Re', render.patientName);
    doc.moveDown(1).font('Helvetica').fontSize(11).text('Dear colleague,').moveDown(0.6).text(render.body, { align: 'left' }).moveDown(1).text('Kind regards,').moveDown(0.4).font('Helvetica-Bold').text(render.doctorName).font('Helvetica').text(render.specialty);
  } else {
    field(doc, 'Patient', render.patientName);
    field(doc, 'Doctor', `${render.doctorName} (${render.specialty})`);
    field(doc, 'Visit date', fmtDate(render.date));
    doc.moveDown(1).font('Helvetica-Bold').text('Diagnosis').font('Helvetica').text(render.diagnosis).moveDown(0.8).font('Helvetica-Bold').text('Plan').font('Helvetica').text(render.plan);
  }

  doc.end();
  return done;
}

function titleOf(render: DocumentRender): string {
  switch (render.kind) {
    case 'lab-report':
      return `Laboratory report: ${render.test}`;
    case 'referral-letter':
      return 'Referral letter';
    case 'visit-summary':
      return 'Consultation summary';
    case 'image':
      return render.title;
    case 'identity':
      return 'Identity document specimen';
  }
}

function field(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#344054').text(`${label}: `, { continued: true }).font('Helvetica').fillColor('#101828').text(value);
}

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------
type Rgb = [number, number, number];

class Canvas {
  readonly pixels: Buffer;

  constructor(readonly width: number, readonly height: number, background: Rgb) {
    this.pixels = Buffer.alloc(width * height * 4);
    this.rect(0, 0, width, height, background);
  }

  set(x: number, y: number, [r, g, b]: Rgb, alpha = 1): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    this.pixels[i] = Math.round(this.pixels[i] * (1 - alpha) + r * alpha);
    this.pixels[i + 1] = Math.round(this.pixels[i + 1] * (1 - alpha) + g * alpha);
    this.pixels[i + 2] = Math.round(this.pixels[i + 2] * (1 - alpha) + b * alpha);
    this.pixels[i + 3] = 255;
  }

  rect(x: number, y: number, w: number, h: number, color: Rgb, alpha = 1): void {
    for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) this.set(xx, yy, color, alpha);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: Rgb, alpha = 1): void {
    for (let y = -ry; y <= ry; y += 1) {
      for (let x = -rx; x <= rx; x += 1) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) this.set(cx + x, cy + y, color, alpha);
      }
    }
  }

  text(value: string, x: number, y: number, scale: number, color: Rgb): void {
    let cursor = x;
    for (const char of value.toUpperCase()) {
      const glyph = FONT[char] ?? FONT['?'];
      glyph.forEach((row, rowIndex) => {
        for (let col = 0; col < 5; col += 1) {
          if (row[col] === '#') this.rect(cursor + col * scale, y + rowIndex * scale, scale, scale, color);
        }
      });
      cursor += 6 * scale;
    }
  }

  textWidth(value: string, scale: number): number {
    return value.length * 6 * scale;
  }

  centeredText(value: string, y: number, scale: number, color: Rgb): void {
    this.text(value, Math.round((this.width - this.textWidth(value, scale)) / 2), y, scale, color);
  }

  png(): Buffer {
    const raw = Buffer.alloc((this.width * 4 + 1) * this.height);
    for (let y = 0; y < this.height; y += 1) {
      raw[y * (this.width * 4 + 1)] = 0;
      this.pixels.copy(raw, y * (this.width * 4 + 1) + 1, y * this.width * 4, (y + 1) * this.width * 4);
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(this.width, 0);
    header.writeUInt32BE(this.height, 4);
    header[8] = 8; // bit depth
    header[9] = 6; // RGBA
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

function renderPng(render: Extract<DocumentRender, { kind: 'image' } | { kind: 'identity' }>): Buffer {
  if (render.kind === 'identity') return renderIdentity(render);
  const width = 720;
  const height = 540;
  const palettes: Record<typeof render.style, { bg: Rgb; fg: Rgb }> = {
    skin: { bg: [226, 186, 160], fg: [190, 80, 80] },
    xray: { bg: [18, 20, 26], fg: [205, 210, 220] },
    dental: { bg: [120, 40, 50], fg: [240, 236, 222] },
    eye: { bg: [40, 10, 6], fg: [230, 120, 40] },
  };
  const { bg, fg } = palettes[render.style];
  const canvas = new Canvas(width, height, bg);
  if (render.style === 'skin') {
    [[220, 230, 9], [300, 260, 7], [360, 210, 11], [420, 300, 6], [470, 240, 8], [260, 330, 7], [520, 320, 9]].forEach(([x, y, r]) => {
      canvas.ellipse(x, y, r + 6, r + 6, fg, 0.25);
      canvas.ellipse(x, y, r, r, fg, 0.85);
    });
  } else if (render.style === 'xray') {
    canvas.rect(300, 60, 60, 190, fg, 0.85);
    canvas.ellipse(330, 260, 70, 34, fg, 0.85);
    canvas.ellipse(330, 330, 66, 30, fg, 0.85);
    canvas.rect(302, 340, 56, 170, fg, 0.85);
    canvas.rect(266, 288, 128, 10, bg, 1); // narrowed joint space
  } else if (render.style === 'dental') {
    canvas.ellipse(360, 270, 250, 150, [200, 90, 100], 0.9);
    for (let i = 0; i < 8; i += 1) canvas.ellipse(160 + i * 57, 210 + Math.abs(3.5 - i) * 10, 24, 34, fg, 1);
    canvas.ellipse(331, 214, 7, 7, [90, 70, 50], 0.9);
  } else {
    canvas.ellipse(360, 270, 220, 220, [170, 60, 30], 1);
    canvas.ellipse(450, 260, 34, 34, [245, 205, 120], 1);
    for (let i = 0; i < 6; i += 1) canvas.rect(250 + i * 8, 140 + i * 40, 220 - i * 20, 3, [120, 20, 20], 0.9);
  }
  canvas.rect(0, 0, width, 46, [180, 35, 24]);
  canvas.centeredText('SYNTHETIC DEMO DOCUMENT', 12, 3, [255, 255, 255]);
  canvas.rect(0, height - 70, width, 70, [16, 24, 40], 0.85);
  canvas.text(render.title, 20, height - 58, 2, [255, 255, 255]);
  canvas.text(render.subtitle, 20, height - 30, 2, [200, 205, 215]);
  return canvas.png();
}

function renderIdentity(render: Extract<DocumentRender, { kind: 'identity' }>): Buffer {
  const width = 800;
  const height = 500;
  const canvas = new Canvas(width, height, render.side === 'medical-license' ? [244, 240, 228] : [222, 236, 230]);
  canvas.rect(0, 0, width, 54, [180, 35, 24]);
  canvas.centeredText(SPECIMEN_MARK, 15, 4, [255, 255, 255]);
  const title = render.side === 'medical-license' ? 'MEDICAL PRACTICE LICENCE' : render.side === 'selfie-with-id' ? 'SELFIE HOLDING ID CARD' : 'NATIONAL ID CARD - FRONT';
  canvas.text(title, 40, 90, 3, [16, 24, 40]);
  // Portrait placeholder.
  canvas.rect(40, 150, 200, 240, [180, 190, 200]);
  canvas.ellipse(140, 230, 52, 60, [120, 130, 145]);
  canvas.ellipse(140, 360, 85, 50, [120, 130, 145]);
  if (render.side === 'selfie-with-id') canvas.rect(150, 320, 110, 70, [240, 240, 240]);
  canvas.text('NAME', 280, 170, 2, [102, 112, 133]);
  canvas.text(render.holderName.replace(/^DR\.\s*/i, 'DR '), 280, 194, 3, [16, 24, 40]);
  canvas.text('NUMBER', 280, 250, 2, [102, 112, 133]);
  canvas.text('0000 0000 0000 00', 280, 274, 3, [16, 24, 40]);
  canvas.text('ISSUED BY', 280, 330, 2, [102, 112, 133]);
  canvas.text('ORIVEX DEMO DATA', 280, 354, 3, [16, 24, 40]);
  canvas.rect(0, height - 50, width, 50, [180, 35, 24], 0.9);
  canvas.centeredText('FICTIONAL - FOR SOFTWARE DEMONSTRATION ONLY', height - 36, 2, [255, 255, 255]);
  return canvas.png();
}

// 5x7 bitmap glyphs.
const FONT: Record<string, string[]> = {
  A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  B: ['#### ', '#   #', '#   #', '#### ', '#   #', '#   #', '#### '],
  C: [' ### ', '#   #', '#    ', '#    ', '#    ', '#   #', ' ### '],
  D: ['#### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
  F: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#    '],
  G: [' ### ', '#   #', '#    ', '# ###', '#   #', '#   #', ' ####'],
  H: ['#   #', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  I: [' ### ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  J: ['  ###', '   # ', '   # ', '   # ', '   # ', '#  # ', ' ##  '],
  K: ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '# # #', '#   #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '#  ##', '#   #', '#   #', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
  Q: [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ## #'],
  R: ['#### ', '#   #', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
  S: [' ####', '#    ', '#    ', ' ### ', '    #', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '#   #', '# # #', '# # #', '## ##', '#   #'],
  X: ['#   #', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '#   #'],
  Y: ['#   #', '#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
  '0': [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  '2': [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
  '3': ['#####', '   # ', '  #  ', '   # ', '    #', '#   #', ' ### '],
  '4': ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # '],
  '5': ['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '],
  '6': ['  ## ', ' #   ', '#    ', '#### ', '#   #', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
  '8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
  '9': [' ### ', '#   #', '#   #', ' ####', '    #', '   # ', ' ##  '],
  ' ': ['     ', '     ', '     ', '     ', '     ', '     ', '     '],
  '-': ['     ', '     ', '     ', ' ### ', '     ', '     ', '     '],
  '.': ['     ', '     ', '     ', '     ', '     ', ' ##  ', ' ##  '],
  ':': ['     ', ' ##  ', ' ##  ', '     ', ' ##  ', ' ##  ', '     '],
  '/': ['    #', '    #', '   # ', '  #  ', ' #   ', '#    ', '#    '],
  '(': ['   # ', '  #  ', ' #   ', ' #   ', ' #   ', '  #  ', '   # '],
  ')': [' #   ', '  #  ', '   # ', '   # ', '   # ', '  #  ', ' #   '],
  "'": ['  #  ', '  #  ', '     ', '     ', '     ', '     ', '     '],
  '?': [' ### ', '#   #', '    #', '   # ', '  #  ', '     ', '  #  '],
};
