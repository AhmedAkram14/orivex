export interface SignPrescriptionContentRequest {
  consultationSessionId: string;
  diagnosisNodeId: string;
  authoringDoctorId: string;
  lineItems: Array<{ drugCatalogId: string; dosage: string; frequency: string; durationDays: number }>;
  signedAt: Date;
}

export interface SignPrescriptionContentResult {
  /** Hex-encoded HMAC-SHA256 digest over the canonical prescription content -- tamper-evident, not itself the public marker. */
  signatureHash: string;
  /** Short, public-safe code embedded in the PDF (text + QR) -- what GET /prescriptions/verify/:code actually looks up. */
  verificationCode: string;
}

// Port only (docs/06-system-architecture.md Section 11). I12 -- Prescription
// digital signature (ORIVEX Remaining Work Audit): HMAC-SHA256 keyed by
// PRESCRIPTION_SIGNING_SECRET is this codebase's real, always-on signing
// scheme -- unlike Stripe/LiveKit/SendGrid, prescription signing is core to
// the product's own legal requirement (docs/01-prd.md L185 §7, Egyptian
// E-Signature Law 15/2004), so there is no NotConfigured fallback: the
// secret is a required env var (env.schema.ts), matching JWT_ACCESS_SECRET's
// own "no safe default for a signing secret" precedent. Honest scope note:
// HMAC is a shared-secret MAC, verifiable only by this backend (via the
// verify endpoint) -- not an offline-verifiable asymmetric signature a
// pharmacy could check without calling us. A real PKI upgrade (RSA/ECDSA
// with a published public key) is a legitimate future step, not something
// this pass silently skips.
export interface PrescriptionSignerPort {
  sign(request: SignPrescriptionContentRequest): SignPrescriptionContentResult;
}
