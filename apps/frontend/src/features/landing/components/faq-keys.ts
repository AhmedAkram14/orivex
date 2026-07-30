// Grounded only in real product behavior confirmed in the audit backing
// this page: booking requires doctor approval (both Free and Paid),
// becoming a doctor goes through real identity/professional verification,
// video consultations are the real LiveKit-backed core call (no
// recording/AI summary claimed), prescriptions are sign/view/print only
// (no pharmacy transmission claimed).
//
// Kept in its own plain (non-"use client") module: faq-section.tsx needs
// "use client" for its Radix accordion, which turns every export of a
// client module into a client reference when imported from a Server
// Component -- HomePage (a Server Component) needs this as a real array to
// build its JSON-LD FAQPage structured data, not a client reference.
export const FAQ_KEYS = ['booking', 'becomeDoctor', 'verification', 'consultations', 'prescriptions'] as const;
