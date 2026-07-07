Phase 2 — User Experience Foundation
This is the largest document yet, and it earns that length honestly — but I'll use tables aggressively rather than prose padding, since density and scannability matter more than word count for a document meant to be referenced, not read cover-to-cover.

1. User Personas
Patient Persona — "Mona, the Chronic Care Navigator"

Background: 42, Cairo, marketing manager, manages hypertension and mild anxiety, sees 2–3 different doctors across specialties.
Goals: Avoid re-explaining her history every visit; get quick access to a doctor without taking a half-day off work; keep her prescriptions and readings organized.
Motivations: Control over her own chronic condition; not wanting her workplace to know about her mental health visits.
Frustrations: Paper prescriptions get lost; every new doctor starts from zero; booking by phone during work hours is impractical.
Digital behavior: Heavy smartphone user, moderate app literacy, uses WhatsApp constantly, doesn't trust unfamiliar apps with health data by default.
Technical skill: Medium — comfortable with common apps, easily frustrated by clunky flows.
Emotional state entering the platform: Mildly anxious (health-related tasks carry background stress even when routine).
Accessibility needs: None currently, but represents the "impatient, busy, moderately trusting" middle-majority user.
Daily workflow: Checks phone between meetings; would book/manage health tasks in short 2–3 minute windows, not long sessions.
Success criteria: "I didn't have to repeat myself, and I got real help in under 15 minutes."

Patient Persona — "Am Hassan, the Rural First-Timer"

Background: 61, Fayoum, retired teacher, limited smartphone experience, hypertension and early diabetes signs, nearest specialist is 90 minutes away.
Goals: Get specialist input without traveling; understand his condition in plain language.
Motivations: Family encouraged him to try it; genuinely worried about symptoms but distrustful of "talking to a doctor through a phone."
Frustrations: Small text, unfamiliar icons, fear of "doing it wrong" and wasting a doctor's time.
Digital behavior: Uses WhatsApp with family help; unfamiliar with app navigation patterns (tabs, swipes).
Technical skill: Low.
Emotional state: Anxious and skeptical — needs reassurance at every step, not just efficiency.
Accessibility needs: Large text, simple navigation, ideally voice support; may need family member assistance for onboarding.
Daily workflow: Uses phone mainly in the evening with a family member nearby.
Success criteria: "I understood what the doctor told me, and it felt like a real doctor, not a robot."

Doctor Persona — "Dr. Yasmin, the Ambitious Specialist"

Background: 34, dermatologist, private clinic in Alexandria, wants to build a broader patient base and professional reputation online.
Goals: Fill idle evening hours with paid consultations; build a recognizable personal brand; minimize admin overhead.
Motivations: Income growth and professional visibility, not just altruism.
Frustrations: No time for admin work; distrust of tech platforms that don't understand medical workflows; worried about liability from remote diagnosis.
Digital behavior: Active on Instagram professionally already; comfortable with apps but impatient with slow or clunky ones.
Technical skill: Medium-high.
Emotional state: Confident, slightly guarded (protecting professional reputation).
Accessibility needs: None typically, but represents the majority "efficiency-first" doctor user.
Daily workflow: Checks the platform between clinic patients and in the evening; consultations happen in short defined blocks.
Success criteria: "I saw 6 patients this evening without touching a second screen, and my notes were basically done for me."

Doctor Persona — "Dr. Mahmoud, the Public-Service GP"

Background: 29, general practitioner, volunteers time for free consultations in underserved areas, early career, building reputation.
Goals: Build patient volume and visible track record; contribute to access equity; eventually convert some patients to paid follow-ups.
Motivations: Purpose-driven, not purely income-driven — needs recognition-based incentives, not just earnings dashboards.
Frustrations: Free-tier patients sometimes no-show or aren't serious; hard to stand out against established specialists in discovery.
Digital behavior/skill: High digital comfort (younger, tech-native).
Emotional state: Motivated but occasionally discouraged by low visibility.
Success criteria: "I can see my free consultations are actually making a difference, and I'm building a real reputation, not just donating time invisibly."

Admin Persona — "Sara, the Trust & Safety Operator"

Background: 27, platform employee, manages doctor verification queue and content moderation.
Goals: Process verification quickly without cutting corners; catch problematic content/doctors before harm occurs.
Motivations: Institutional responsibility — she's personally accountable if a bad actor slips through.
Frustrations: Incomplete doctor documentation, ambiguous edge cases without clear policy, high volume during growth spurts.
Digital behavior/skill: High — power user of internal tools, wants efficient bulk actions and clear audit trails for her own protection.
Emotional state: Vigilant, risk-aware, wants clear escalation paths for ambiguous cases rather than having to personally judge everything.
Success criteria: "I can verify a doctor thoroughly in under 10 minutes, and I have a clear audit trail if anyone ever questions a decision I made."


2. User Journey Maps
I'll present these as structured tables — this is the correct format for what's fundamentally comparative, cross-stage information, and prose would only obscure it.
Patient Journey
StageGoalsActionsThoughtsPain PointsEmotionsOpportunitiesAI OpportunitiesTrust OpportunitiesDiscoveryFind out if this platform can actually helpSearches online / gets referral / sees an ad"Is this legitimate? Are the doctors real?"No way to verify legitimacy pre-signupSkeptical, cautiousShow verified-doctor count / Syndicate-verification badge on landing page before signupAI-personalized landing content based on entry query (e.g., "searching for dermatologist" → tailored specialty preview)Public doctor verification stats visible without an accountOnboardingGet set up with minimum frictionRegisters, fills basic Health Passport info"Do I have to fill all this in now?"Long forms feel like a wall before getting valueImpatientProgressive Health Passport — collect minimum at signup, enrich over time / at first consultationAI-assisted OCR to pre-fill from an uploaded old prescription/IDShow exactly what data is required vs. optional, and whyVerification (N/A directly — patients aren't verified, but identity confirmation applies)Confirm identity for account securityConfirms phone/email/OTP"Is this necessary?"OTP delivery delaysMild annoyanceFast, reliable OTP delivery via multiple channels—Clear explanation of why identity confirmation matters for medical recordsBookingFind the right doctor quicklySearches, filters, compares profiles, picks slot"Is this doctor actually good for my issue?"Overwhelming choice, unclear differentiationUncertainSmart search narrows to relevant doctors fastAI Smart Doctor Search from symptom descriptionPortfolio verification badges visible at a glance during comparisonConsultationGet real helpJoins video call, describes issue, receives guidance"Is this doctor actually listening/competent?"Technical issues, awkwardness of first video-doctor experienceAnxious → (hopefully) relievedClear pre-call checklist (camera/mic test) reduces first-time anxietyLive suggested-questions panel helps doctor (indirectly improves patient experience)Visible "this call is secure and private" messaging at call startFollow-upUnderstand next steps clearlyReviews prescription, notes, follow-up plan"What do I actually do now?"Medical jargon in notes, unclear action itemsSlight confusion if notes are too clinicalPatient-friendly summary layer over clinical notesAI Timeline/Journey summarization in plain languageClear indication of what's now part of permanent medical record vs. draftRetentionCome back when needed againReturns for a new issue or a scheduled follow-up"Will this be as easy as last time?"Starting a new specialty search from scratch feels like starting overComfortable if experience was smoothHealth Journey continuity makes return visits feel like "picking up," not starting overJourney-aware notifications ("time for your hypertension follow-up")Access history shows nothing suspicious has happened to their dataLong-term engagementFeel like the platform is part of ongoing health, not a one-off toolBrowses Knowledge Center, follows doctors, checks Health Passport"Is this actually helping me stay healthy, or just reactive?"No reason to open the app when not sickNeutral/disengaged riskKnowledge Center content tied to active Journeys keeps relevance between visitsPersonalized health insights dashboardLongstanding transparent data practices build compounding trust
Doctor Journey
StageGoalsActionsThoughtsPain PointsEmotionsOpportunitiesAI OpportunitiesTrust OpportunitiesDiscoveryEvaluate if this is worth their timeHears from colleagues / sees marketing"Will this actually bring me patients, or waste my time?"Skepticism toward another "doctor app"Skeptical, pragmaticShow real doctor success stories/earnings potential transparently—Show existing verified doctor community as social proofOnboardingGet listed with minimal admin burdenFills profile, uploads credentials"This better not take hours"Long onboarding forms, unclear what's required for verificationImpatientAI-assisted onboarding pre-fills from uploaded certificatesAI-assisted document parsing for credential fieldsClear, honest verification timeline shown upfront (not vague "we'll review it")VerificationGet approved quickly and fairlyWaits for Syndicate license check"Why is this taking so long? Did I do something wrong?"Opaque waiting period with no status visibilityAnxious, occasionally frustratedReal-time verification status tracker (like a package tracker)—Transparent verification criteria published upfrontBooking/Availability setupControl their own schedule easilySets availability windows, free/paid slot mix"I don't want to be double-booked or overwhelmed by free requests"Complex scheduling UI, fear of free-tier floodingCautiousSmart default availability templates by specialtyAI-suggested optimal availability based on patient demand patternsClear no-show/cancellation policies protecting doctor's timeConsultationDeliver good care efficientlyJoins Workspace, reviews history, treats patient, documents"I don't want this to take longer than an in-person visit"Screen switching, redundant documentationFocused, sometimes rushedZero-context-switch WorkspaceLive SOAP drafting, drug/allergy alerts, suggested questionsPatient's declared data-sharing consent visible before viewing historyFollow-upEnsure continuity without excess adminReviews AI-drafted note, approves prescription"I need to trust this AI didn't miss something dangerous"Over-trusting or under-trusting AI draftsCautiously confidentClear AI confidence/reasoning displayAI Follow-up Plan draftEvery AI suggestion shows its reasoning/source dataRetentionKeep earning and growing reputationChecks earnings, analytics, reviews"Is this actually worth my continued time investment?"Unclear ROI without good analyticsMotivated if data is positiveTransparent, actionable analytics (not vanity metrics)Doctor Intelligence insights (response time coaching, growth suggestions)Transparent commission/payout breakdown every cycleLong-term engagementBuild a lasting professional brandPublishes Knowledge Center content, grows Portfolio"Is this actually building my reputation, or just busywork?"No visible ROI from content effortMotivated if engagement is visiblePortfolio "contribution" visualization (GitHub-style)AI content-topic suggestions based on patient search trendsVerified-content badges maintain credibility of published material
Admin Journey
StageGoalsActionsThoughtsPain PointsEmotionsOpportunitiesAI OpportunitiesTrust OpportunitiesDiscovery (onboarding as staff)Understand tools and responsibilitiesTrained on verification/moderation policy"What's my actual authority and liability here?"Ambiguous policy for edge casesUncertainClear, documented decision trees for common ambiguous cases—Clear escalation path for cases outside policyVerification workflowProcess doctor applications thoroughly but efficientlyReviews documents, cross-checks Syndicate status"Did I miss anything that could let a bad actor through?"Manual, repetitive verificationVigilant, occasionally fatigued at volumeBulk-review tools, pre-flagging of incomplete applicationsAI-assisted document/credential parsing to accelerate review, human always makes final callImmutable log of every verification decision and rationaleOngoing moderationCatch problems before they cause harmReviews flagged content/reports, investigates disputes"Am I being fair and consistent?"High volume, inconsistent judgment risk without clear rulesResponsible, sometimes overloadedConsistent rubric-based moderation toolingAI-assisted content flagging (never auto-removal)Every moderation action is logged and, where appropriate, explainable to the affected doctorRetention (as staff)Feel effective and supported in roleUses dashboards, escalates complex cases"Do I have the tools to do this job well?"Tool fatigue, unclear metrics of their own effectivenessDepends on tooling qualityClear internal analytics on queue health, resolution time——

3. End-to-End User Flows
Given the sheer number requested (30+), I'll structure these consistently and concisely — Entry/Steps/Exit/Alternative/Failure/Recovery — prioritizing the highest-stakes flows in full detail and grouping simpler ones together at the end.
Patient Registration

Entry: Landing page "Get Started" / referral link.
Steps: Enter phone or email → OTP verification → basic profile (name, DOB, gender) → optional immediate Health Passport basics (can skip) → account created.
Exit: Lands on Patient Dashboard with a clear "complete your Health Passport" prompt (not forced).
Alternative paths: Social/SSO signup (future); guardian-initiated signup for a minor.
Failure scenarios: OTP not received; duplicate account (existing phone/email).
Recovery: Resend OTP via alternate channel (SMS→WhatsApp future); duplicate detection offers login instead of new registration.

Doctor Registration → Verification

Entry: "Join as a Doctor" landing page.
Steps: Basic account creation → professional details form (specialty, license number, education) → document upload (Syndicate license, ID, certificates) → submission → Verification queue (Admin) → approved/rejected/needs-more-info.
Exit: Approved → Portfolio goes live, onboarding to Workspace tour. Rejected → clear reason + reapplication path.
Alternative paths: AI-assisted pre-fill from uploaded documents (Section on AI Copilot).
Failure scenarios: Illegible document upload; license number doesn't match Syndicate records; expired license.
Recovery: Clear re-upload prompt with specific reason ("license number couldn't be matched — please re-check and resubmit"), not a generic rejection.

Booking (Paid Consultation)

Entry: Doctor Portfolio "Book Consultation" button.
Steps: Select consultation type (if doctor offers both) → select available slot → confirm patient details/reason for visit → payment → confirmation.
Exit: Confirmation screen + calendar entry + notification.
Alternative paths: Waitlist if no slots available; guardian booking on behalf of a minor.
Failure scenarios: Payment fails after slot reserved; slot taken by another patient during checkout (race condition).
Recovery: Slot held with short reservation timer during payment; if payment fails, slot releases automatically and patient is notified with retry option, not left in limbo.

Booking (Free Consultation)

Entry: Same as above, no payment step.
Steps: Select slot → confirm reason for visit → confirmation (no payment screen at all — this must feel structurally different, not just "$0 checkout," per Phase 1's business rule).
Exit: Confirmation + free-slot usage counted against monthly patient cap (silently, not shown as a scary "limit" unless nearing it).
Failure scenario: Patient has hit their monthly free-tier cap.
Recovery: Clear, non-punitive messaging: "You've used your free consultations this month — here are paid options, or check back on [date]."

Rescheduling / Cancellation

Entry: From booking confirmation or dashboard.
Steps: Select new slot or cancel → system checks cancellation window rule (Phase 1 business rules) → refund/no-refund determined automatically and shown clearly before confirming.
Failure scenario: No alternative slots available from same doctor.
Recovery: Offer similar doctors with availability as a fallback, don't leave patient stranded.

Video Consultation

Entry: "Join Consultation" button active within a defined pre-appointment window.
Steps: Device check (camera/mic test) → waiting room → doctor joins → consultation → doctor marks complete → post-call summary shown to patient.
Failure scenarios: Doctor disconnects mid-call; patient loses connection; call never connects due to a technical issue.
Recovery: Auto-reconnect attempt (both sides); if reconnection fails within a grace period, automatic rebooking offer + no-fault refund if paid, and the consultation state is clearly marked "interrupted" rather than silently vanishing.

Prescription Creation

Entry: Inside Doctor Workspace, post-consultation (or during, saved as draft).
Steps: Doctor selects/searches medication → AI Copilot checks interactions/allergies against Health Passport → doctor adjusts dosage/instructions → digital signature → issued.
Failure scenario: AI interaction check flags a conflict.
Recovery: Flag is shown prominently before signing, doctor must explicitly acknowledge or change the prescription — cannot be silently dismissed.

Health Journey Creation

Entry: During/after a consultation where a doctor documents a new diagnosis.
Steps: Doctor tags the consultation note as a new Journey (or links it to an existing one) → Journey created with initial stage "Diagnosis" → visible in patient's Health Passport.
Alternative path: Doctor links this consultation to an existing Journey instead of creating a new one (e.g., a hypertension follow-up).
Failure scenario: Doctor unsure whether this is a new Journey or continuation of an existing one.
Recovery: System surfaces likely-related existing Journeys as suggestions (based on condition/history) before defaulting to "create new."

Knowledge Center — Publishing an Article

Entry: Doctor Portfolio → "Publish" action.
Steps: Draft article/video → (if new/low-trust-tier doctor) submitted for pre-publication review → (if established doctor) published directly with post-publication spot-review eligibility.
Failure scenario: Content flagged during moderation review.
Recovery: Doctor receives specific feedback on what needs revision, not just "rejected."

Following a Doctor / Searching Doctors / Searching Articles
Standard discovery flows — entry via search or profile view, exit via follow/save action; failure mode is primarily "no relevant results," recovered via broadened search suggestions or AI-assisted query reformulation ("did you mean...").
Leaving Reviews

Entry: Triggered automatically post-consultation-completion.
Steps: Multi-dimension rating → optional written review → submit.
Failure/edge case: Patient tries to review without a completed consultation (blocked entirely, not just discouraged).

Updating Health Passport / Consent & Privacy Settings

Entry: Health Passport section, anytime.
Steps: Edit any section → for sharing settings specifically, toggle per-doctor or per-category visibility (with the Mental Health exception requiring separate, explicit confirmation, per Phase 1.1).
Failure scenario: Patient revokes a doctor's access during an active consultation.
Recovery: This is a genuinely tricky edge case — recommended behavior: access already granted for the current session is not retroactively yanked mid-call (that could be clinically dangerous), but the revocation takes effect for all future access immediately after the call ends. This needs to be explicitly explained to the patient in the revoke-confirmation UI so they understand the timing.

Managing Availability / Managing Doctor Portfolio
Standard CRUD-style flows for the doctor, low failure complexity — main edge case is a doctor removing availability that has existing bookings, which must trigger a required rebooking/notification flow to affected patients, never a silent cancellation.
AI Copilot Interactions

Entry: Contextual panel appears automatically based on Workspace context (never manually opened as a chat).
Steps: Doctor views suggestion → edits/accepts/dismisses → if accepted, content flows into the relevant draft (note/prescription/etc.).
Failure scenario: AI service is unavailable.
Recovery: Workspace functions fully without AI (manual note-taking, manual prescription entry) — AI must be additive, never a blocking dependency, which is itself a core design requirement, not just a fallback detail.

Emergency Contact Flow

Entry: Patient adds/edits emergency contact in Health Passport, or a doctor accesses it during an active consultation.
Failure scenario: Doctor believes a patient is in acute danger during a consultation (e.g., expressing suicidal ideation, or describing acute physical emergency symptoms).
Recovery: This deserves its own designed flow, not an afterthought — the Workspace should have a clear, fast-access "Emergency Protocol" action (surfacing local emergency numbers, emergency contact info, and guidance) that the doctor can trigger immediately without navigating away from the call.

Payment / Refund

Entry: Checkout step of paid booking, or refund trigger (cancellation policy, technical failure).
Failure scenario: Payment succeeds but booking confirmation fails to save (a classic distributed-systems edge case, flagged again in Section 5).
Recovery: Idempotent booking confirmation reconciliation — patient should never be charged without a confirmed booking existing on the backend; if this state is ever detected, auto-refund with proactive notification, don't wait for the patient to complain.

Admin Approval / Content Moderation / Doctor Suspension

Entry: Verification queue or flagged-content queue.
Steps: Review → approve/reject/escalate, with mandatory reason logging.
Failure/edge case: Doctor suspended mid-way through active, booked upcoming consultations.
Recovery: Suspension flow must auto-trigger patient notifications and rebooking assistance for all affected upcoming appointments — a suspension can't just silently orphan booked patients.

Patient Data Export

Entry: Trust Center / Health Passport settings.
Steps: Request export → generate structured/PDF package → download link (time-limited, secure).
Failure scenario: Large record takes time to generate.
Recovery: Async generation with notification when ready, not a blocking spinner.


4. Permissions Matrix
ModulePatientDoctorAdminSecretary (future)Clinic (future)Lab (future)Pharmacy (future)Insurance (future)Own Health PassportR/W/Export/Share(consent)R (consented sections only)R (audit-logged, compliance only)————R (claims-relevant only, future)Doctor PortfolioRR/W (own)R/W (moderation)/ApproveR/W (on doctor's behalf, future)R———Booking/CalendarC/R/U/D (own)R/U (own availability)R (support only)C/U (on doctor's behalf, future)R (aggregate, future)———Video ConsultationJoin (own)Join/Host (own)R (metadata only, not content, exceptional access logged)—————Consultation NotesR (own, doctor-authored)C/R/U (own patients)R (compliance/dispute only, logged)—————PrescriptionsR (own)/ExportC (own patients)/RR (compliance only)———R (fulfillment, future)—Lab RequestsR (own)C (own patients)R (compliance only)——R (assigned, future)——PaymentsR (own)/InitiateR (own earnings)R/Approve refunds—————ReviewsC (own, post-consult)/RR/Respond (own)Approve/Remove (moderation)—————Knowledge CenterR/Save/Share/FollowC/U/D (own)/RApprove/Remove (moderation)—————NotificationsR (own)/PreferencesR (own)/PreferencesR (system-level)—————Admin/Verification—Submit (own application)Full C/R/U/Approve—————Audit LogsR (own access history only)R (own access history only)R (full, logged)—————
Note: Future roles are intentionally left mostly minimal/undefined here — designing their full permission sets now would be premature detail for roles not being built in V1, but the table format itself is worth having ready so extending it later is additive, not a redesign.

5. Edge Cases (100)
Organized by category for scannability rather than one flat list.
Video & Connectivity (1–15)

Doctor disconnects mid-consultation → auto-reconnect attempt; if failed, mark session "interrupted," offer rebooking, no-fault refund if paid.
Patient loses internet mid-consultation → same as above, symmetric handling.
Both parties disconnect simultaneously → session logged as interrupted, same recovery.
Call never connects (technical failure before start) → no charge triggered at all; automatic priority rebooking.
Poor bandwidth degrades video → automatic fallback to audio-only with clear on-screen notice to both parties.
Doctor's device camera/mic permission denied → pre-call device check catches this before the patient is kept waiting.
Patient joins from an unsupported browser/device → clear compatibility message with suggested alternatives, not a silent failure.
Consultation runs over scheduled time with another patient waiting → doctor gets a visible time-remaining indicator; next patient sees "doctor running slightly late" rather than silence.
Screen share fails to load an attached image/result → fallback to direct in-chat file share.
Patient joins from two devices simultaneously → only one active session permitted; second device gets a clear "already in an active session" notice.
Time drift between doctor and patient devices causes early/late join confusion → server-side authoritative clock, not client clock, for join-window enforcement.
Recording fails to save despite consent given → doctor/patient notified that no recording exists (fail loud, not silent).
Consultation exceeds maximum allowed platform session length → soft warning before hard cutoff, with rebooking offered for continuation.
Doctor accidentally ends call early → grace-period rejoin window before the session is finalized as complete.
Video quality dispute (patient claims it was unusable, doctor disputes) → connection-quality logs (Section 2.6 business rule) used for resolution, not "he-said-she-said."

Payments & Bookings (16–30)
16. Payment succeeds but booking record fails to save → idempotent reconciliation job auto-detects and auto-refunds + notifies proactively.
17. Two patients attempt to book the same slot simultaneously → slot lock with short reservation timer during checkout; second patient sees real-time "just booked" update.
18. Refund issued but original payment method no longer valid (expired card) → refund routed to an alternate method or wallet credit, with clear communication.
19. Doctor cancels a confirmed paid appointment → automatic full refund + priority rebooking assistance, no patient action required.
20. Patient's payment is flagged as potentially fraudulent by the PSP → booking held pending resolution, patient notified transparently, not silently cancelled.
21. Currency/pricing display mismatch due to a caching bug → server-side price is always source of truth at charge time; any client-display mismatch triggers a confirm-before-charge step.
22. Doctor changes their price after a patient has already booked at the old price → honored at the booked price, never retroactively changed.
23. Free-tier patient hits their monthly cap mid-search → shown clearly before they invest time picking a doctor, not at the final booking step.
24. Duplicate booking attempt (patient double-clicks "Confirm") → idempotency key prevents duplicate charge/booking.
25. Patient requests a refund outside the policy window → routed to a dispute/admin review flow rather than a flat auto-denial, since context (e.g., platform fault) may justify an exception.
26. Doctor's payout account details are invalid/outdated → payout held with clear notification to doctor to update details, not silently failed.
27. Partial refund calculation dispute (e.g., late cancellation) → policy and calculation shown transparently to the patient before dispute is even needed.
28. Waitlisted patient's slot opens up but they've since booked elsewhere → automatic waitlist expiry/cleanup, not a stale notification sent regardless.
29. Consultation marked complete but payment capture fails afterward → doctor still gets paid per platform guarantee (business risk absorbed by platform, not passed to doctor after service was delivered) — a policy decision worth confirming with Finance, but the safer default.
30. Time zone mismatch causes a patient to miss a booked slot → all times always displayed in the patient's local device time zone, doctor's slots normalized server-side, with the timezone explicitly labeled in confirmations to avoid ambiguity.
Doctor Verification & Credentials (31–42)
31. Doctor's Syndicate license expires while active on platform → automatic re-verification trigger before expiry, with a grace-period warning; expired license auto-suspends new bookings (not existing ones already scheduled, which get admin review).
32. Doctor submits fraudulent credentials → verification rejected, repeated attempts flagged for potential platform ban, not just a routine rejection.
33. Doctor changes specialty after verification → triggers partial re-verification for the new specialty claim specifically.
34. Two doctors share a very similar name, causing Syndicate lookup ambiguity → manual admin resolution required, system flags rather than guesses.
35. Doctor's verification documents are illegible → specific re-upload request citing exactly which document and why.
36. Doctor disputes a rejected verification → formal appeal flow with a different admin reviewer for fairness.
37. Doctor's license is suspended by the Syndicate after already being verified on-platform → needs a periodic re-check mechanism (not just at initial verification), since license status can change.
38. Doctor attempts to re-register after a previous rejection using slightly different details → duplicate-detection matching (ID/license number) rather than name-only.
39. Doctor's professional memberships/awards claims can't be independently verified → labeled clearly as self-reported vs. verified in the UI, as established in Phase 1.1.
40. Doctor account compromised (credential theft) → suspicious login triggers security event, account can be admin-frozen pending doctor identity re-confirmation.
41. Doctor tries to publish Knowledge Center content before verification completes → blocked; publishing requires verified status, consistent with the trust model.
42. Multiple doctors flagged in a network are found to share a suspicious credential-forwarding pattern → escalated as a potential fraud ring, not handled as isolated individual cases.
Health Passport / Health Journey (43–58)
43. Health Journey merge needed (two journeys turn out to be the same condition) → doctor-initiated merge action with full audit trail of the original separate entries preserved, not deleted.
44. Health Journey split needed (one journey actually covers two distinct conditions) → doctor-initiated split, both new journeys retain shared history up to the split point.
45. Patient self-logs data (e.g., home BP reading) that contradicts a journey's current stage → logged as patient-reported data distinctly from doctor-confirmed clinical stage, never auto-overriding clinical status (per Phase 1.1 rule).
46. Consent revoked for a doctor mid-active-Journey they're treating → future access blocked, current session unaffected (per Section 3 above), and the Journey remains intact under the patient's ownership.
47. Patient disputes accuracy of a clinical note in their record → formal dispute/correction-request flow logged as an addendum, never silently editing the original record (medical record integrity principle from Phase 1.2).
48. Two doctors document conflicting diagnoses in the same Journey → both entries preserved with timestamps and authorship; no auto-resolution, this is a real clinical judgment matter for the patient/doctors to address, not software's job to arbitrate.
49. Emergency contact information is outdated at the moment it's needed → periodic gentle prompts to review, but no way to fully guarantee currency — communicate this limitation honestly rather than implying certainty.
50. Guardian-managed minor account: what happens at age of majority → defined transition flow where account ownership/consent shifts to the now-adult patient, with guardian access explicitly revoked unless the patient re-grants it.
51. Patient wants to permanently delete their account and data → must reconcile "patient owns their data" principle with medical record retention requirements that may exist under Egyptian law even after account deletion — needs explicit legal guidance before finalizing this flow; flag as an open question, not a guess.
52. Mental Health data accidentally shared broadly due to a settings misconfiguration → this is exactly the scenario the separate consent toggle (Phase 1.1) is designed to prevent structurally, not just through UI warnings.
53. Patient's uploaded document (via OCR) is misread/misfiled by AI → doctor and patient can both flag and correct OCR-derived entries; nothing OCR-derived becomes "confirmed" without human review.
54. Family history data entered by patient conflicts with what a relative (also a patient on the platform) has entered → no cross-patient data merging happens automatically; each patient's record is independently owned, even if related.
55. Health Journey has no updates for a very long time (patient stopped following up) → Journey shown as "inactive/needs follow-up" rather than silently stale, prompting patient/doctor re-engagement.
56. Insurance information entered is outdated/incorrect → display-only in V1 (per Phase 1.1), so risk is limited, but should still show a "last updated" timestamp so staleness is visible.
57. Wearable data integration (future) conflicts with manually entered lifestyle data → out of scope for V1, but data model should anticipate a "source" field per data point (manual vs. device) for future reconciliation.
58. Patient's Health Passport export requested while active edits are in progress → export reflects a consistent snapshot at request time, not a partially-updated mid-write state.
AI Copilot (59–68)
59. AI generates an incorrect or nonsensical clinical suggestion → doctor's approval gate is the safety net; UI should make it easy to reject/ignore, not just accept-or-edit.
60. AI is unavailable/times out during a live consultation → Workspace functions fully manually (Section 3's Copilot flow), never a blocking dependency.
61. AI drug-interaction alert is a false positive → doctor can override with a required brief justification note, logged for later review/audit (helps refine the model over time and creates an accountability trail).
62. AI drug-interaction alert is a false negative (misses a real interaction) → this is the most serious possible AI failure mode; requires the interaction database itself to be a licensed, maintained clinical data source, not just model inference — flag as a build-vs-buy decision for Phase 2/3, not something to solve with prompting alone.
63. Doctor over-relies on AI drafts without real review ("approval fatigue") → UI should require an active acknowledgment (e.g., can't approve without the note being visibly displayed for at least a moment, occasional prompts encouraging review) rather than a one-click blind approve — a real design challenge worth dedicated UX testing.
64. AI transcription mishears a critical detail (e.g., a drug name) during live speech-to-text → transcription is always shown as editable draft text, never silently injected into a final note.
65. Patient speaks a dialect/accent the transcription handles poorly → doctor can always fall back to manual typing; transcription is an aid, not the only input method.
66. AI suggests a Knowledge Center topic to a doctor that turns out to be sensitive/inappropriate for public content → doctor remains sole publisher of record; suggestion is just a prompt, not auto-published.
67. AI risk alert flags a pattern that turns out to be a false alarm, creating unnecessary patient anxiety if visible to them → recommend risk alerts are doctor-facing only by default, not directly patient-visible, to avoid uncontextualized alarm.
68. AI Copilot suggestion history needs to be reconstructed later for a liability review → every AI suggestion shown to a doctor at time of decision must be logged verbatim (flagged already in Phase 1.2's readiness gaps) — this is a hard requirement, not optional telemetry.
Knowledge Center (69–75)
69. Article reported by multiple patients as misleading → escalated moderation priority based on report volume, not just a flat queue order.
70. Doctor publishes content that's technically accurate but reads as an advertisement for a specific paid product/brand → moderation policy needs an explicit stance on this (likely: disclosure required, no undisclosed promotional content).
71. Doctor account suspended after publishing several articles → published content's fate needs a clear policy (likely: remains visible with an "author no longer active" notice rather than mass-deleting, unless the suspension was for content-integrity reasons specifically).
72. Patient shares an article externally and the content is later corrected/retracted → shared links should reflect the current corrected version, not a frozen snapshot, to avoid spreading outdated medical info.
73. Two doctors publish conflicting health information on the same topic → not automatically resolved; platform should avoid appearing to endorse one over the other beyond verification status.
74. Non-medical spam attempts to exploit Knowledge Center as a publishing platform → this is only possible for verified doctors already (per Phase 1.1 rule), which substantially limits this risk by design.
75. Article contains outdated medical guidance that was correct at publish time but isn't anymore → periodic content-freshness review prompts to original authors, not indefinite untouched permanence.
Admin / Platform Operations (76–85)
76. Doctor suspended with active upcoming bookings → auto-triggers patient notification + rebooking assistance flow (per Section 3).
77. Admin account itself is compromised → highest-severity security event, immediate freeze + mandatory re-verification, full audit review of recent actions taken by that account.
78. Two admins take conflicting moderation actions on the same case → last-action-wins with full audit trail showing both actions and actors, for later review/policy clarification.
79. Verification queue backlog grows faster than admin capacity during a growth spurt → this is an operational staffing problem the product should surface clearly (queue health dashard) rather than silently degrade doctor onboarding experience.
80. Admin needs to access a specific patient record for a legitimate compliance investigation → requires logged justification at time of access, not just role-based blanket access.
81. Content moderation decision is later found to be wrong (a legitimate doctor's content was wrongly removed) → clear appeal and reinstatement flow, with the doctor notified of the correction.
82. A regulatory body requests data disclosure → needs a defined legal-request handling process (separate from routine admin access), ideally requiring legal review before any disclosure — flag for legal/compliance planning outside this UX document's scope but worth naming as a needed process.
83. Bulk doctor suspension needed (e.g., a systemic fraud ring found) → admin tooling should support bulk actions with the same individual audit rigor, not a shortcut that skips logging.
84. Admin dashboard itself has stale data during a sync delay → clear "last updated" timestamps on all admin views to avoid decisions based on outdated info.
85. Doctor appeals a suspension and wins → reinstatement must restore full Portfolio/discovery visibility, not leave them in a degraded state post-reinstatement.
Accounts, Sessions & Data (86–100)
86. Deleted account's data referenced by another user's record (e.g., a doctor who saw them) → the patient's deletion request shouldn't corrupt the doctor's legitimate clinical record of having treated them; likely resolution is anonymizing rather than fully deleting cross-referenced clinical entries — needs the same legal guidance flagged in edge case 51.
87. Child/guardian account: child turns 18 mid-active-Journey → transition flow (edge case 50) needs to preserve Journey continuity across the ownership transfer.
88. Guardian account managing multiple children → clear account-switching UX, not a single conflated identity.
89. Expired session during an active consultation → session should be kept alive/refreshed silently during an active video call regardless of normal timeout rules — a hard requirement, not a nice-to-have.
90. Expired session during a prescription-signing action → must re-authenticate before finalizing a signature (security-sensitive action shouldn't proceed on a stale session), but with the in-progress draft preserved, not lost.
91. Storage quota/limits reached for document uploads (Health Passport attachments) → clear proactive warning before hard failure, not a silent upload rejection.
92. Broken/corrupted file upload (e.g., a scanned lab result) → clear re-upload prompt with file-format guidance, not a cryptic error.
93. User changes their registered phone number → requires re-verification of the new number before it becomes the primary contact/login method.
94. Duplicate patient accounts created accidentally (e.g., signed up twice with different phone numbers) → manual merge-request flow via support, since auto-merging medical records is too risky to automate.
95. Timezone change due to travel affects a patient's upcoming appointment display → always resolved against the doctor's actual local slot time with the patient's current device timezone applied for display, recalculated dynamically, not cached at booking time.
96. Platform-wide outage during scheduled consultations → mass-notification + automatic no-fault rebooking/refund process, not case-by-case manual handling.
97. A doctor and patient have a personal relationship outside the platform (conflict of interest) → not automatically detectable; policy should exist (e.g., professional conduct guidelines referencing Medical Syndicate ethics) even if not technically enforced.
98. Patient attempts to book their own account as if browsing anonymously to leave a fake review for a competitor doctor they also happen to be treated by → review eligibility tied strictly to verified completed consultations (Phase 1 rule) substantially mitigates this, but cross-account collusion (friends leaving fake reviews for each other) remains a residual risk worth a fraud-detection flag (Platform Intelligence, Phase 1.2).
99. AI Copilot infrastructure itself experiences a data breach/leak of suggestion logs → since these logs necessarily contain sensitive clinical context (edge case 68), they need the same security tier as core medical records, not treated as "just logs."
100. A regulatory change (new Egyptian telemedicine law) requires retroactive changes to consent language or data handling → the consent management system (Trust Layer) needs to support versioned consent records, so we can prove what a user agreed to at what point in time, and support re-consent flows when terms change — this is a real, foreseeable scenario given the "evolving legal framework" flagged back in Phase 1, not a hypothetical.

6. Notification Matrix
NotificationRecipientTriggerPriorityChannelsTimingBooking confirmedPatient, DoctorSuccessful bookingHighPush, Email, In-appImmediateAppointment reminderPatientUpcoming appointmentHighPush, SMS24h and 1h beforeDoctor running latePatientDoctor delayedMediumPush, In-appReal-timeConsultation completedPatientDoctor marks completeMediumIn-app, PushImmediatePrescription readyPatientPrescription signedHighPush, EmailImmediate, PHI-safe preview text (Phase 1 rule)Review requestPatient1–2 hours post-consultationLowPush, In-appDelayed slightly to allow reflectionPayment receiptPatientSuccessful paymentMediumEmailImmediateRefund processedPatientRefund issuedMediumPush, EmailImmediateDoctor verification status updateDoctorStatus change in queueHighEmail, In-appImmediateNew booking receivedDoctorPatient books a slotHighPush, In-appImmediateCancellation/rescheduleBoth partiesEither party cancels/reschedulesHighPush, SMS, EmailImmediateLow availability warningDoctorCalendar nearly empty for upcoming daysLowIn-appWeekly digestNew review receivedDoctorPatient submits reviewMediumIn-app, EmailImmediateArticle published successfullyDoctorPublish action completes (or clears moderation)LowIn-appImmediateContent flagged/removedDoctorModeration actionHighEmail, In-appImmediate, with reasonLicense expiry approachingDoctorX days before expiryHighEmail, SMS, In-app30/14/3 days beforeDoctor suspendedDoctor, affected PatientsAdmin actionCriticalEmail, SMS, In-appImmediateVerification queue item pendingAdminNew doctor applicationMediumIn-app, Email digestReal-time + daily digestContent reportedAdminPatient/doctor reportMedium–High (scaled by volume)In-appReal-timeSecurity event detectedAdmin, affected userSuspicious login/accessCriticalEmail, SMS, In-appImmediateData export readyPatientExport generation completesLowEmail, PushImmediateHealth Journey follow-up duePatientDoctor-set follow-up interval elapsesMediumPush, In-appOn scheduleEmergency protocol triggeredAdmin (log only, no patient-facing spam)Doctor invokes emergency flowCriticalIn-app (admin), audit logImmediate
WhatsApp (future): Recommended for appointment reminders and booking confirmations specifically, given very high WhatsApp penetration/trust in Egypt — this is a genuinely strong future channel choice worth prioritizing over generic push for time-sensitive reminders once built.

7. Empty States
ContextEmpty State Message ApproachEngagement HookNo consultations yet (patient)Warm, non-clinical tone: "Your consultations will show up here."Prominent "Find a doctor" CTA, maybe a curated "popular specialties" promptNo Health Journeys yet"Your health journeys begin with your first diagnosis."Explain the concept briefly with a simple visual, not just blank spaceNo articles/Knowledge Center content followed"Discover trusted health content from verified doctors."Suggested articles based on any stated Health Passport conditionsNo reviews yet (doctor)"Reviews will appear after your first completed consultations."Encourage doctor to complete their Portfolio in the meantimeNo patients yet (doctor)"Once verified, your patients will appear here."Link to Portfolio completion checklist and availability setupNo appointments (doctor, slow day)Neutral, not alarming: "No appointments scheduled for this day."Quick link to adjust availability or promote a free slotNo search results"No doctors matched — try broadening your filters."Offer to notify when a matching doctor becomes available (waitlist-style)No notificationsSimple, calm: "You're all caught up."No forced engagement hook needed here — calm absence is the right feeling
Principle applied throughout: empty states should never feel like errors or dead ends (violates Calm Interfaces and Patients Should Never Feel Lost) — always a next action, but never guilt-inducing or aggressively salesy.

8. Error States
ErrorUser-Facing ApproachRecovery PathNetwork failureClear offline indicator, not a cryptic technical errorAuto-retry with visible status; queue non-urgent actions (like draft notes) for sync when back onlinePayment failureSpecific reason where possible ("card declined" vs. generic "something went wrong")Retry with alternate method; slot held briefly during retry windowVideo failureDistinguish "your connection" vs. "our service" issues where detectableReconnect flow (Section 5); fallback to audio; rebooking if unresolvedPermission error (e.g., accessing unshared data)Explain why clearly ("This patient hasn't shared this section with you") rather than a flat "Access Denied"Doctor can request access if clinically relevant; patient gets a clear consent request, not a bypassServer error (500)Calm, human tone, not a stack traceAuto-retry option, support contact if persistentExpired sessionPreserve any in-progress draft content before prompting re-loginRe-authenticate, return to exact previous stateUpload failureSpecific reason (file too large, unsupported format)Clear re-upload guidance404Friendly, on-brand, not a generic dead pageClear path back to Dashboard/SearchMedical data conflict (e.g., conflicting Journey entries, Section 5 edge case 48)Never auto-resolve silentlySurface both entries transparently to the doctor with clear authorship/timestamps

9. Product Microinteractions
Restrained by design — per the brief's own instruction, and consistent with Calm Interfaces:

Loading: subtle, minimal spinner/skeleton states — never playful mascots or attention-grabbing animation, this is healthcare, not a consumer game.
Saving: quiet inline confirmation (a small checkmark fade-in), no modal interruption.
Uploading: clear progress indicator, calm color (not alarming red/orange until actual failure).
Appointment confirmed: a brief, understated success state — confidence-inspiring, not celebratory (this isn't a purchase confirmation for a consumer product, tone should stay measured).
Prescription generated: clear "signed and issued" moment with the doctor's signature visually present — this should feel official, reinforcing trust, more than delightful.
Doctor verified: this one can carry a touch more warmth/celebration — it's a genuine milestone moment for the doctor and reinforces the "you earned this trust badge" feeling, done tastefully (a subtle badge reveal, not confetti).
AI working: a clearly labeled, calm "thinking" indicator distinct from the app's own loading states, so the doctor always knows when they're waiting on AI vs. the system generally.
Health Journey updated: subtle visual progression along the journey's stage timeline — this is one place a little more visual richness is earned, since it directly reinforces the product's core differentiator (Apple Health-style calm data visualization, per Phase 1.1's design references).
Article published: understated confirmation, plus a quiet nudge toward the Portfolio "contribution" visualization (Phase 1.2's GitHub-style idea) to reinforce accumulating value.
Payment success: clean, Stripe-like clarity — a receipt-style confirmation, not a celebratory animation; money moments should feel precise, not fun.
Achievement moments (e.g., doctor's 100th consultation, patient's first full year of Health Passport history): worth a small number of very restrained milestone acknowledgments — but sparingly, and never gamified in a way that could pressure clinical behavior (e.g., never gamify consultation volume in a way that could subtly incentivize rushed care).


10. Accessibility Strategy

Older adults: larger default touch targets and text sizing options, minimal reliance on gesture-based navigation, clear linear flows over complex nested menus (directly serves the "Am Hassan" persona).
Low digital literacy: plain-language microcopy throughout (avoid jargon even in system messages), optional guided/simplified onboarding mode.
Screen readers: full semantic markup and ARIA labeling as a baseline requirement, not a later audit pass — this needs to be a Phase 3 design-system constraint from day one.
RTL (Arabic): full mirrored layout, not just text direction — icons, navigation flow, and even the Health Journey timeline visualization need genuine RTL-aware design, not a text-only flip.
Color blindness: never rely on color alone for meaning (e.g., a Health Journey status shouldn't be red/green only — use icons/text labels alongside color).
Motor impairments: generous touch target sizing, minimal drag-and-drop-only interactions (always provide a non-drag alternative), avoid strict time-limited actions where possible (e.g., don't let a short slot-reservation timer expire without a clear warning and easy retry).
Large text support: layouts must reflow gracefully at increased text sizes, not truncate or overlap — a real testing requirement, not just a system-setting pass-through assumption.
Keyboard navigation: full keyboard operability for the Doctor Workspace especially (per the Linear/Notion inspiration, keyboard-first efficiency is both an accessibility and a power-user requirement simultaneously).
Voice support: valuable for the "Am Hassan" persona segment particularly; recommend at least basic voice-guided onboarding/navigation as a Future/Advanced item rather than full V1 scope, given the engineering complexity — but flag it as a near-term priority given the target market's real accessibility needs, not a distant nice-to-have.


11. Final UX Critique
Confusing workflows worth resolving now: The Health Journey merge/split flow (edge cases 43–44) is conceptually sound but genuinely hard to make intuitive for a doctor mid-consultation without slowing them down — this deserves real usability testing in Phase 3, not just a confident design assumption.
Too many clicks: Free consultation booking should be even lighter than paid booking (Section 3 correctly removes payment, but "select reason for visit" could also be optional/skippable for very quick free consults) — worth reconsidering whether we're accidentally making the free flow just as heavy as paid out of consistency-mindedness, when the two personas (Mona vs. Am Hassan) may want genuinely different levels of guided detail.
Missing opportunity: No explicit onboarding flow difference between a "Mona" (efficiency-seeking, moderate literacy) and an "Am Hassan" (needs guidance, low literacy) persona was designed above — I'd recommend a lightweight, optional "guided mode" toggle discoverable early (not hidden in settings) rather than assuming one onboarding flow serves both personas equally well.
Accessibility problem worth naming directly: Voice support is listed as Future/Advanced, but given how real the low-digital-literacy rural persona is for this specific market (per Phase 0's target-audience segmentation), deprioritizing voice support fully to a later version deserves one more explicit gut-check before Phase 3 locks scope — it may be higher-value, sooner, than its current "Future" label suggests.
Trust issue worth flagging: The Emergency Protocol flow (edge case 68/89 area, Section 3) is currently the least-developed high-stakes flow in this entire document relative to how serious its failure mode is (a doctor missing or fumbling a genuine emergency signal during a video consult). This deserves dedicated design attention in Phase 3, potentially with actual clinical/emergency-response consultation input, not just internal product-team design.
Cognitive overload risk: The Doctor Workspace's "everything visible, zero context switching" goal (Phase 1.1) is the single biggest cognitive-load risk in the whole system if progressive disclosure isn't rigorously applied — I'll say again what I said in Phase 1.1: this needs to be actively defended in every future screen review, not just designed well once.
Anything unrealistic: The 100-free-consultation-cap and free/paid non-competing discovery lanes (Phase 1) sound clean in principle but will need real behavioral testing once live — patient behavior around "free" incentives is notoriously hard to predict from design alone, and I'd flag this specifically as something to validate with real usage data early rather than assume the policy is right on paper.
Challenging our assumptions directly: This document assumes patients will thoughtfully manage granular per-doctor consent settings (Health Passport sharing). Realistically, most users default-accept whatever is easiest, which means the default sharing settings we choose in Phase 3 will matter far more than the existence of granular controls themselves. We should treat "what's the default" as a first-class product decision, not an implementation detail — this is where good intentions in a UX document can quietly fail in practice if defaults are chosen carelessly.

UX Readiness Score: 81/100
What's strong: Comprehensive persona/journey coverage, a genuinely useful edge-case catalogue (especially around AI accountability, Health Journey integrity, and payment/booking race conditions), and honest self-critique rather than a polished rubber stamp.
What must be resolved before Information Architecture:

Emergency Protocol flow needs real design attention — currently underdeveloped relative to its stakes.
Default consent/sharing settings (raised in the critique above) need an explicit product decision, since defaults will dominate real-world behavior regardless of how granular the controls are.
Onboarding differentiation for the two clearly-different patient literacy personas needs at least a lightweight resolution before Information Architecture locks the primary navigation/flow structure.
Voice support prioritization deserves one more explicit review given the specific target market's real accessibility needs, rather than defaulting it to "Future" by inertia.

Once these four are addressed, this would comfortably sit at 90+. None of them block starting Information Architecture, but I'd want the Emergency Protocol and consent-defaults questions specifically resolved in parallel very early in that phase, since they'll influence the information hierarchy itself.