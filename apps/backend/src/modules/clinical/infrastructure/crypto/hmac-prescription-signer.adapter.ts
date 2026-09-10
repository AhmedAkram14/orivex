import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import type {
  PrescriptionSignerPort,
  SignPrescriptionContentRequest,
  SignPrescriptionContentResult,
} from '../../application/ports/prescription-signer.port.js';

// I12 -- Prescription digital signature (ORIVEX Remaining Work Audit): the
// real, always-on adapter (see the port's own doc comment for why there is
// no NotConfigured fallback here). Canonicalizes the signed content as a
// stable JSON string (line items sorted by drugCatalogId so signature
// order never depends on request-body ordering) before HMAC-SHA256'ing it
// with PRESCRIPTION_SIGNING_SECRET.
@Injectable()
export class HmacPrescriptionSignerAdapter implements PrescriptionSignerPort {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  sign(request: SignPrescriptionContentRequest): SignPrescriptionContentResult {
    const secret = this.configService.get('PRESCRIPTION_SIGNING_SECRET', { infer: true });
    const canonical = this.canonicalize(request);
    const signatureHash = createHmac('sha256', secret).update(canonical).digest('hex');
    return { signatureHash, verificationCode: this.toVerificationCode(signatureHash) };
  }

  private canonicalize(request: SignPrescriptionContentRequest): string {
    const sortedLineItems = [...request.lineItems]
      .sort((a, b) => a.drugCatalogId.localeCompare(b.drugCatalogId))
      .map((item) => ({
        drugCatalogId: item.drugCatalogId,
        dosage: item.dosage,
        frequency: item.frequency,
        durationDays: item.durationDays,
      }));
    return JSON.stringify({
      consultationSessionId: request.consultationSessionId,
      diagnosisNodeId: request.diagnosisNodeId,
      authoringDoctorId: request.authoringDoctorId,
      lineItems: sortedLineItems,
      signedAt: request.signedAt.toISOString(),
    });
  }

  // A short, human-typeable public marker -- the first 16 hex chars of the
  // signature itself, grouped for readability (e.g. "A1B2-C3D4-E5F6-A7B8").
  // Deliberately not a separate random id: the code is only ever meaningful
  // together with the signature it's derived from, so deriving it removes
  // an entire class of "code and signature disagree" bug.
  private toVerificationCode(signatureHash: string): string {
    const chars = signatureHash.slice(0, 16).toUpperCase();
    return chars.match(/.{1,4}/g)!.join('-');
  }
}
