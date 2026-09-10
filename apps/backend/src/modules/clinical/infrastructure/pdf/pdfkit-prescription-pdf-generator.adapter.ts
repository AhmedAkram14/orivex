import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

import type {
  GeneratePrescriptionPdfRequest,
  PrescriptionPdfGeneratorPort,
} from '../../application/ports/prescription-pdf-generator.port.js';

// I12 -- Prescription PDF generation (ORIVEX Remaining Work Audit): a plain,
// single-page document -- doctor/patient identity, the signed medication
// list, and a signature block carrying the verification code as both text
// and a scannable QR code (encoding the real verify URL) -- a pharmacy can
// either type the code in or scan it. pdfkit streams pages rather than
// building one buffer directly, so generate() collects the emitted chunks
// itself and resolves once the document is finalized.
@Injectable()
export class PdfkitPrescriptionPdfGeneratorAdapter implements PrescriptionPdfGeneratorPort {
  async generate(request: GeneratePrescriptionPdfRequest): Promise<Buffer> {
    const qrCodePng = await QRCode.toBuffer(request.verificationUrl, { margin: 1, width: 160 });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Prescription', { align: 'center' });
      doc.moveDown();

      doc.fontSize(11);
      doc.text(`Prescribing doctor: ${request.doctorName}`);
      doc.text(`License number: ${request.doctorLicenseNumber}`);
      doc.text(`Patient: ${request.patientName}`);
      doc.text(`Signed: ${request.signedAt.toISOString()}`);
      doc.moveDown();

      doc.fontSize(13).text('Medications', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      for (const item of request.lineItems) {
        doc.text(`• ${item.drugName} — ${item.dosage}, ${item.frequency}, ${item.durationDays} day(s)`);
        if (item.instructions) {
          doc.text(`  Instructions: ${item.instructions}`, { indent: 10 });
        }
      }
      doc.moveDown();

      doc.fontSize(13).text('Signature', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`This prescription is cryptographically signed. Verification code: ${request.verificationCode}`);
      doc.text(`Verify at: ${request.verificationUrl}`);
      doc.moveDown(0.5);
      doc.image(qrCodePng, { width: 100 });

      doc.end();
    });
  }
}
