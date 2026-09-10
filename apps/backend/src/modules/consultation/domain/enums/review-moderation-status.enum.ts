// I11 -- Admin content moderation (ORIVEX Remaining Work Audit): matches
// ConsultationFeedback's real Prisma enum exactly. Visible is the default
// for every review ever submitted; Flagged is a precautionary, immediate
// exclusion from the public doctor-directory/profile list the moment the
// reviewed doctor raises a concern (never a silent delete -- the row still
// exists for an admin to review); Hidden is the admin's own confirmed
// decision, distinct from a bare flag.
export enum ReviewModerationStatus {
  Visible = 'visible',
  Flagged = 'flagged',
  Hidden = 'hidden',
}
