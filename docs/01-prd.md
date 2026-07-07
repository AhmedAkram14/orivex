Phase 1 — Product Requirements Document (PRD)
Codename: "Wasfa" (وصفة — Arabic for "prescription/recipe," evokes both medical prescriptions and "the recipe for care")
Before the PRD itself, three grounding facts from regulatory research that change real decisions below — not just compliance footnotes:

Egypt has no single unified telemedicine law yet; it operates on a patchwork (Electronic Signature Law 15/2004 legitimizes e-signatures/e-consent, Medical Syndicate Law 45/1969 governs doctor conduct, and MoHP issued National Telehealth Guidelines in 2023) alongside an evolving malpractice law and GAHAR 2025 accreditation standards. Egypt E-Health Market | 2019 – 2030 | Ken Research +2
Ministry of Health regulations require medical data to be stored on locally hosted servers, and cloud-native apps must comply with Egyptian data residency laws, and although Egypt doesn't follow HIPAA, HIPAA-aligned practices (access control, encryption, audit logging, consent management) are treated as the enterprise-grade bar. AU StartupsAU Startups
Physicians offering telemedicine in Egypt must hold a valid license from the Egyptian Medical Syndicate, and digital prescription legality is still evolving, with current practice requiring prescriptions to be issued by licensed physicians and contain full medical information, alongside a strong focus on data security and anti-counterfeiting. ResearchGateResearchGate

This has an immediate architectural consequence we'll formalize in Phase 2, but must state now: "globally scalable, multi-region ready" and "medical data must reside on Egyptian servers" are not automatically in conflict, but they mean your architecture needs data residency as a first-class design constraint from day one — a multi-region-ready system where the Egypt tenant's PII/PHI stays in-country while your application layer, code, and non-sensitive analytics can scale globally. If we design assuming freedom to place patient data anywhere, we'll need a costly re-architecture later. This should be treated as a hard constraint, not an optimization.

1. Product Scope
   In Scope — Version 1.0

Patient registration, lifelong health profile, doctor discovery, booking, secure video consultation, in-consultation chat, post-consultation prescriptions, medical timeline, notifications, payments (EGP, local rails), reviews.
Doctor public professional profile (LinkedIn-style), availability/calendar management, consultation delivery, patient management, prescription builder, basic analytics, earnings dashboard, verification pipeline.
Admin: user management, doctor verification workflows, dispute/moderation, platform-wide analytics, payment oversight.
AI assistant features that support (not replace) doctor's clinical workflow, all requiring explicit doctor approval before entering the medical record.
Full audit logging, RBAC, and consent management infrastructure (non-negotiable for a healthcare product, even in "V1").

Explicitly Out of Scope — Version 1.0

Secretary, Clinic Manager, Laboratory, Pharmacy roles as full modules (we design the data model to not preclude them, but do not build their workflows now).
Insurance claims integration / UHIS integration (Egypt's Universal Health Insurance System is real and growing, but integrating with it is a multi-month government-relations project, not a V1 engineering task).
In-house payment processing / becoming a licensed payment institution — V1 integrates a licensed local payment gateway/PSP, it does not build one.
Native mobile apps in V1.0 (we recommend a mobile-responsive web app / PWA first — see recommendation at the end).
Multi-language beyond Arabic + English.
Cross-border consultations (doctor and patient both must be within Egypt for V1 — cross-border licensing is legally unresolved).

Future Versions

Pharmacy fulfillment network integration, lab test ordering + results ingestion, UHIS/insurance billing integration, native iOS/Android apps, clinic/B2B white-label tenant model, subscription chronic-care programs, diaspora-doctor consultations (Egypt is actively building this via EHA/UHIS, so partnership rather than competition may be the smarter long-term play), multi-country expansion. Intelehealth

Pushback: Your brief calls this "Version 1.0, not an MVP, flagship production-ready." I want to name the tension directly: a true production-grade V1 with everything listed (public profiles + lifelong health records + AI everywhere + full doctor dashboard + admin) is a 9–12 month build for a strong team, not a "portfolio project" timeline. That's fine if the goal is genuinely a serious build — but if this is meant to be shippable in weeks, we need to shrink scope further. I'm treating your brief at face value (serious V1), but flagging this so it's a conscious choice, not a surprise in month 4.

2. Product Modules
   For each module: Purpose, Goals, Main Features, Dependencies, Business Rules.
   2.1 Authentication & Identity
   Purpose: Securely establish who a user is and what they're allowed to do, across two very different trust levels (patient identity vs. verified medical professional identity).
   Goals: Frictionless patient onboarding; rigorous doctor identity/credential verification; strong session security given medical data sensitivity.
   Main features: Email/phone + OTP registration, national ID verification hooks for doctors, password + optional MFA, session management, role-based access control, account recovery.
   Dependencies: Doctor Verification (Admin module), National ID/Syndicate lookup (external, if available).
   Business rules: Doctors cannot receive bookings until verification is approved. Patients under legal minor age require guardian-linked accounts (a rule many competitors skip — this needs deliberate design, not a footnote, because pediatric telemedicine has distinct consent rules).
   2.2 Doctor Discovery
   Purpose: Help patients find the right doctor, not just a doctor.
   Goals: Relevance over popularity bias; prevent free-tier doctors from being drowned out or exploited; make availability trustworthy (no stale "online" badges).
   Main features: Specialty/condition search, advanced filters (language, gender, price, availability window, free/paid, rating, years of experience), real-time availability indicator, "next available slot" surfacing.
   Dependencies: Doctor Profiles, Calendar, Reviews.
   Business rules: Ranking algorithm must not purely reward volume (which favors already-popular doctors and starves new doctors of demand — a cold-start killer). Free and paid doctors should NOT be ranked in one undifferentiated list by default (see business rules section for detail).
   2.3 Doctor Profiles (Professional Identity Platform)
   Purpose: This is your differentiator, per your brief — treat it as such, not as a footnote. A LinkedIn-style professional identity for doctors: credentials, specialties, experience, publications/case interests, patient outcomes, endorsements from verified peers.
   Goals: Build durable trust and reputation that outlasts any single booking; give doctors a reason to invest time curating their presence (identity, not just a listing).
   Main features: Verified credentials badge, education/training history, specialties & sub-specialties, years of practice, languages spoken, consultation types offered (free/paid/both) with pricing, public reviews/ratings, response time stats, "About" narrative, professional photo, optional peer endorsements.
   Dependencies: Doctor Verification, Reviews, Analytics.
   Business rules: Only Syndicate-verified doctors get a public profile visible in discovery. Peer endorsements only from other verified doctors on-platform (to prevent fake endorsement rings). Profile edits to credentials trigger re-verification, not silent updates.
   Team challenge: A "LinkedIn for doctors" only works if doctors actually populate it richly — LinkedIn succeeded because of network effects (recruiters, peers) that don't exist for a niche vertical platform on day one. We should design the profile to auto-populate as much as possible from verification data (so it's rich even with minimal doctor effort), rather than depending on doctors as prolific content creators like LinkedIn assumes.
   2.4 Patient Health Profile (Lifelong Medical Identity)
   Purpose: Per your explicit instruction — this is not "account settings," it's the patient's persistent health identity across their lifetime on the platform.
   Goals: Continuity of care across every doctor interaction; patient ownership and portability of their own data; a foundation any future doctor consultation can build on instantly.
   Main features: Demographics, blood type, chronic conditions, allergies, current medications, past surgeries, family history, vaccination record, consultation history, prescription history, uploaded external documents (lab results, old prescriptions via OCR), growth/vitals tracking where relevant.
   Dependencies: Medical Timeline, Prescriptions, Lab Requests, AI OCR.
   Business rules: Patient owns and controls their data — can revoke a specific doctor's access to their history at any time (except audit-required disclosures). Data included in every new consultation must be the version the patient explicitly consented to share with that doctor (patients may reasonably not want every doctor to see everything — e.g., mental health history hidden from a dermatologist by default, visible on request).
   2.5 Booking & Calendar
   Purpose: Frictionless scheduling that respects real doctor availability.
   Goals: Zero double-booking; graceful handling of no-shows/cancellations; support both free and paid slot types cleanly.
   Main features: Doctor-defined availability windows, buffer times, slot durations per consultation type, patient booking flow, rescheduling, cancellation, waitlist for fully booked doctors, calendar sync (basic).
   Dependencies: Doctor Profiles, Payments, Notifications.
   Business rules: See Business Rules section (cancellation windows, no-show handling, free-slot limits).
   2.6 Video Consultation
   Purpose: The core clinical delivery mechanism — this is the product, not a feature.
   Goals: Reliability above all (a dropped call mid-diagnosis is a trust and liability event, not just a UX bug); security/privacy of the call; support for the doctor's clinical workflow during the call, not just "video chat."
   Main features: Secure 1:1 video/audio, waiting room, screen share (for showing results/images), in-call chat, session recording (with explicit consent, if legally permitted and enabled), consultation timer, connection quality indicators, fallback to audio-only on poor connection.
   Dependencies: Booking, Consultation Notes, AI Assistant (live transcription).
   Business rules: Recording requires explicit dual consent (patient + doctor) and has strict retention/access rules. A consultation isn't "billable/complete" until a minimum duration or explicit doctor mark-as-complete — this protects against premature disconnect disputes.
   2.7 Consultation Notes & Medical Timeline
   Purpose: Turn each consultation into a permanent, structured entry in the patient's continuous record — this is the retention engine of the whole product.
   Goals: Make the record useful to the next doctor, not just an archive for compliance.
   Main features: Structured SOAP-style notes (Subjective, Objective, Assessment, Plan), diagnosis coding, attachments, links to prescriptions/lab requests issued in that visit, timeline view spanning all doctors/specialties chronologically.
   Dependencies: AI Assistant (SOAP generation draft), Patient Health Profile.
   Business rules: Only the treating doctor can author/edit notes for their own consultation; other doctors get read access only if the patient has granted it (see 2.4).
   2.8 Prescriptions
   Purpose: Legally valid, safe, and clear e-prescriptions.
   Goals: Prevent prescribing errors (drug interactions, allergy conflicts); align with Egypt's still-evolving digital prescription requirements, which require prescriptions to be issued by licensed physicians with full medical information and strong anti-counterfeiting safeguards.
   Main features: Structured prescription builder (drug, dosage, frequency, duration, instructions), digital signature (per Electronic Signature Law), drug interaction/allergy warnings, prescription history, downloadable/shareable PDF with verifiable authenticity marker (e.g., QR/serial for pharmacy verification).
   Dependencies: Patient Health Profile (allergies/current meds), AI Assistant (draft suggestions, interaction alerts).
   Business rules: Only a verified doctor with an active, completed consultation for that patient can issue a prescription. Controlled substances may require additional restrictions/exclusion in V1 given regulatory ambiguity — recommend excluding controlled-substance prescribing entirely from V1 until legal counsel confirms process; the liability/regulatory risk isn't worth early scope. ResearchGate
   2.9 Lab Requests (Lightweight in V1)
   Purpose: Let doctors formally request tests; do NOT build a full lab integration in V1 (out of scope), but do build the request artifact so it exists in the patient's timeline and can be handed to any lab.
   Main features: Structured lab test request document (doctor-authored, downloadable/shareable), historical log in timeline.
   Dependencies: Consultation Notes.
   Business rules: Requests are advisory documents in V1 (no direct lab system integration); results re-enter the system only via patient/doctor manual upload + OCR.
   2.10 Payments
   Purpose: Handle consultation fees, refunds, and doctor payouts trustworthily.
   Goals: Support EGP and local payment methods (cards, mobile wallets — Egypt has strong mobile wallet adoption); handle free consultations cleanly (no payment flow at all, not a "$0 charge").
   Main features: Patient checkout (card/wallet), doctor payout ledger + statements, refund workflow, platform commission handling, invoice generation.
   Dependencies: Booking, licensed local PSP integration (build vs. buy — buy, always, for payments).
   Business rules: See Business Rules section.
   2.11 Reviews & Reputation
   Purpose: Build trust signals that are resistant to gaming.
   Goals: Reviews from actually-completed consultations only; multi-dimensional feedback (not just a single star), since "was the diagnosis right" and "was the doctor kind and communicative" are different signals patients care about differently.
   Main features: Post-consultation review prompt, dimensioned ratings (communication, punctuality, thoroughness), written review, doctor response to review, flagging/moderation.
   Dependencies: Video Consultation (completion trigger), Admin Moderation.
   Business rules: Review eligibility = only patients with a completed, paid-or-free consultation with that specific doctor. One review per consultation, editable within a window. No anonymous doctor-to-doctor review manipulation.
   2.12 Notifications
   Purpose: Timely, non-annoying communication across booking, consultation, and medical events.
   Main features: SMS/email/push/in-app for booking confirmations, reminders, cancellations, prescription ready, review requests. Channel preference control.
   Dependencies: Booking, Payments, Prescriptions.
   Business rules: Medical-content notifications (e.g., "your prescription is ready") must not leak PHI into the notification preview text itself (a common real-world privacy bug — e.g., a push notification showing a diagnosis on a lock screen).
   2.13 Messaging (Asynchronous Chat)
   Purpose: Lightweight pre/post-consultation communication, NOT a substitute for clinical consultation.
   Main features: Text messaging tied to a booking/consultation thread, attachments, read receipts.
   Dependencies: Booking.
   Business rules: Must be clearly scoped as administrative/follow-up communication, not diagnosis-via-chat — this is both a UX clarity issue and a liability issue (a doctor should not be diagnosing over unstructured chat outside a formal consultation record).
   2.14 Patient Dashboard / Doctor Dashboard
   Aggregation layers over the above modules — patient's home base (upcoming appointments, timeline, prescriptions, notifications) and doctor's home base (calendar, patient queue, earnings, analytics). Not separate systems; UX composition layers.
   2.15 Admin Portal
   Purpose: Operational control plane for the business itself.
   Main features: User management, doctor verification queue (credential review workflow), dispute resolution, content moderation (reviews, profiles), platform-wide analytics, payment/payout oversight, audit log viewer.
   Business rules: Every admin action on sensitive data (viewing a patient record, overriding a review, approving a doctor) must be audit-logged with actor, timestamp, and reason — this isn't optional in healthcare.
   2.16 Analytics
   Purpose: Distinct from Admin — this is doctor-facing (their own performance) and platform-facing (business health) analytics.
   Main features (doctor): Patient volume trends, earnings, consultation duration averages, review sentiment.
   Main features (platform): Liquidity metrics (doctor availability vs. patient demand by specialty/region), retention cohorts, consultation completion rates.
   2.17 AI Assistant
   Detailed in Section 8 below — spans nearly every module rather than being a standalone feature.

3. Functional Requirements (Representative Sample — Full Detail Available Per Module on Request)
   Rather than restate every module in requirement-numbered form here (which would roughly double this document's length), I've given detailed feature lists per module above. If you want, I'll produce a dedicated numbered FR-### traceability document per module as a next artifact — that's typically a separate deliverable from the PRD narrative in real PM practice, since it needs to map 1:1 to future test cases.
   Representative example (Video Consultation module):

FR-VC-01: System shall allow a patient and doctor to join a live video session only within a defined window around the scheduled appointment time.
FR-VC-02: System shall degrade gracefully to audio-only when video bandwidth is insufficient, notifying both parties.
FR-VC-03: System shall require explicit dual consent before any session recording begins.
FR-VC-04: System shall prevent a consultation from being marked "complete" and billable until a minimum defined duration has elapsed or the doctor manually confirms completion.
FR-VC-05: System shall log connection quality metrics per session for support/dispute resolution.

4. Non-Functional Requirements
   CategoryRequirementPerformanceVideo join latency < 3s under normal network conditions; API p95 response < 300ms; search/discovery results < 1s.ScalabilityStateless application layer horizontally scalable; architecture must support multi-region deployment while keeping Egyptian patient/health data resident in-country per MoH data residency rules.AvailabilityTarget 99.9% uptime for core booking/video path (this is a clinical-adjacent service — downtime has real-world consequences, unlike a typical SaaS dashboard).AccessibilityWCAG 2.1 AA minimum — non-negotiable for healthcare given elderly/impaired user base; Arabic RTL layout support from day one, not retrofitted.SecurityEncryption at rest and in transit for all PHI; RBAC; MFA for doctors and admins; regular penetration testing before launch.PrivacyExplicit, granular patient consent model (per-doctor data sharing, as discussed in 2.4); data minimization; right to export/delete per applicable data protection principles.ReliabilityRedundant video infrastructure (no single point of failure for the core clinical path); automated failover.Audit LogsImmutable audit trail for every access to PHI — who viewed what, when, why (admin overrides especially).LocalizationArabic (primary) + English (secondary) from V1, not "added later" — retrofitting RTL and medical terminology localization after the fact is expensive and error-prone.InternationalizationArchitecture should not hardcode Egypt-only assumptions (currency, phone format, ID format) even though V1 targets Egypt only — this is the "globally scalable" requirement translated into a concrete engineering constraint.

5. User Roles
   Patient

Responsibilities: Provide accurate health information, attend booked consultations, pay for paid consultations.
Permissions: Manage own health profile, control data-sharing per doctor, book/cancel/reschedule, view own records/prescriptions, leave reviews for completed consultations.
Primary goals: Get quality care quickly; feel that their history/context isn't lost between visits; trust the doctor's legitimacy.
Pain points today: Long clinic wait times, doctor-shopping without information, fragmented paper/PDF medical history, uncertainty about a stranger-doctor's competence online.

Doctor

Responsibilities: Maintain accurate credentials, honor availability commitments, deliver consultations per Syndicate professional standards, author accurate clinical notes/prescriptions.
Permissions: Manage own profile/availability, view only their own patients' shared data, issue prescriptions/lab requests for their own consultations, view own earnings/analytics.
Primary goals: Monetize spare capacity professionally, build reputation, minimize administrative overhead, avoid liability exposure.
Pain points today: No professional-grade tooling without building their own website/scheduling/billing stack; uncertainty about legal standing of digital prescriptions; fragmented, unpaid admin work.

Admin

Responsibilities: Verify doctor credentials rigorously, moderate content/disputes, maintain platform integrity and compliance posture.
Permissions: Full read access to operational data (with audit logging), override capability for disputes, cannot arbitrarily view PHI without a logged reason.
Primary goals: Platform trust and legal compliance; healthy marketplace liquidity; fraud/abuse prevention.
Pain points today (as a role we're designing for): Manual verification doesn't scale; ambiguous regulatory environment increases judgment calls without clear precedent.

6. Master Feature Inventory
   Legend: 🟢 Core · 🔵 Advanced · 🤖 AI-Powered · ⚪ Future
   Authentication: Registration/login 🟢 · MFA 🟢 · Doctor credential verification 🟢 · Guardian-linked minor accounts 🔵
   Discovery: Search/filter 🟢 · Real-time availability 🟢 · Smart search 🤖 · Non-competing free/paid lanes 🔵
   Doctor Profiles: Verified credentials display 🟢 · Public profile 🟢 · Peer endorsements 🔵 · Publications/interests 🔵
   Patient Health Profile: Core health record 🟢 · Per-doctor data sharing control 🟢 · Document OCR ingestion 🤖 · Family history 🔵
   Booking/Calendar: Slot booking 🟢 · Rescheduling/cancellation 🟢 · Waitlist 🔵 · Calendar sync ⚪
   Video Consultation: Secure video/audio 🟢 · In-call chat 🟢 · Recording w/ consent 🔵 · Live transcription 🤖 · Real-time translation 🤖⚪
   Notes/Timeline: SOAP notes 🟢 · AI SOAP draft 🤖 · Cross-specialty timeline 🟢 · Timeline summarization 🤖
   Prescriptions: Structured builder 🟢 · Digital signature 🟢 · Interaction/allergy alerts 🤖 · AI draft 🤖 · Controlled substances ⚪ (excluded V1 pending legal review)
   Lab Requests: Structured request doc 🟢 · Suggested tests 🤖 · Full lab integration ⚪
   Payments: Checkout 🟢 · Payouts 🟢 · Refunds 🟢 · Insurance billing ⚪
   Reviews: Multi-dimension ratings 🟢 · Doctor response 🔵 · Sentiment analytics 🤖
   Notifications: Multi-channel 🟢 · Smart timing 🤖⚪
   Admin: Verification queue 🟢 · Moderation 🟢 · Audit log viewer 🟢 · Platform analytics 🔵
   AI (cross-cutting): See Section 8 in full — all marked 🤖, all require doctor approval before record entry.

7. Business Rules (Detailed)
   Appointment cancellation: Patient-initiated cancellation ≥ X hours before slot (recommend 4–6 hours given telemedicine's flexibility vs. in-person norms) = full refund if paid. Late cancellation (< X hours) = partial or no refund, doctor still gets partial compensation for held time. Doctor-initiated cancellation = always full refund + priority rebooking assistance for patient.
   No-shows: Patient no-show on a paid slot = doctor is compensated (their time was reserved); patient no-show on free slot still counts against a "free slot abuse" limit (see below) to disincentivize casual no-shows crowding out patients who'd actually attend.
   Refunds: Technical failure (platform-side video outage) = automatic full refund, no dispute needed. Patient dissatisfaction with clinical outcome is NOT grounds for refund (this is a clinical judgment question, not a service-quality one) — but poor conduct (rudeness, not showing up, cutting the call short without cause) is reviewable by Admin.
   Video consultation rules: Consultation isn't billable until doctor marks complete or a minimum duration threshold is met. Recording requires dual explicit consent, and recordings inherit the same access controls as medical records (not looser).
   Doctor verification: Verified against Egyptian Medical Syndicate license status, as required for any physician offering telemedicine in Egypt. Re-verification triggered on credential edits or periodically (e.g., annually) since licenses can lapse. ResearchGate
   Review eligibility: Only for completed consultations (free or paid); no review without an actual clinical encounter (prevents fake/competitor reviews).
   Prescription permissions: Only the treating doctor of a completed consultation may issue a prescription for that visit; prescriptions are cryptographically/digitally signed per the Electronic Signature Law, which recognizes electronic signatures as legally binding and underpins the validity of digital consents and records. Ken Research
   Medical record ownership: The patient owns their health profile data. Doctors own their own authored clinical notes/prescriptions (as the professional author of record) but the patient controls visibility of that record to other doctors going forward. Admin has access only for compliance/dispute purposes, always audit-logged.
   Free-tier abuse prevention: Per-patient monthly cap on free consultations platform-wide (not per-doctor, to prevent patients farming multiple free doctors); doctors offering free slots can cap their own daily free volume; a "no-show strike" system for patients that reduces free-tier booking privileges after repeated no-shows.
   Availability rules: A published slot is a commitment — doctor cancellation rate is tracked and affects discovery ranking (protects patients from unreliable doctors without a punitive public callout).
   Payment rules: Platform commission taken transparently and disclosed to doctors upfront; payouts on a defined cycle (e.g., weekly/bi-weekly) with a clear statement; currency is EGP only in V1.

8. AI Features — Integrated Assistant, Not a Chatbot
   Governing principle, restated because it's the most important rule in this entire section: every AI output that could touch the medical record (a note, a prescription draft, a suggested diagnosis-adjacent test) is a draft requiring explicit doctor approval/edit before it becomes part of the record. AI never writes directly to a patient's permanent record. This isn't just an ethical nicety — in Egypt's current regulatory environment, where malpractice law and AI-in-diagnostics guidelines are still being finalized, an AI system that appears to make autonomous clinical decisions is a direct regulatory and liability risk. AU StartupsKen Research
   Patient-facing AI:

AI Smart Doctor Search — semantic search ("I have persistent headaches and blurry vision" → suggests neurology/ophthalmology, not keyword matching).
AI Appointment Preparation — helps patient articulate symptoms/history before the call so consultation time isn't wasted on information-gathering.
Patient Timeline Summarization — plain-language summary of a complex multi-visit history ("here's what's happened with your condition over the past year") — helps patients actually understand their own care.
AI Health Insights Dashboard — trend visibility (e.g., blood pressure readings over time, medication adherence patterns) — insight only, never diagnostic claims.
AI Medical Document OCR — ingest photographed paper prescriptions/lab results into structured timeline data.
AI Translation during consultations — meaningful in Egypt given dialectal Arabic variation and the diaspora-doctor initiative underway nationally, where Egyptian doctors abroad are being connected to patients at home — but flag as Future/Advanced given real-time medical translation accuracy risk. Intelehealth

Doctor-facing AI (all draft-only, approval-gated):

Live Speech-to-Text during consultation.
AI Consultation Summary / SOAP Note Generator — drafts structured notes from the transcript; doctor reviews/edits/approves.
AI Prescription Draft — suggests based on documented symptoms/diagnosis; doctor must approve every line before signing.
Drug Interaction & Allergy Alerts — checked against the patient's existing profile at prescribing time — this is the single highest-value, lowest-risk AI feature in the whole list, because it's a safety net, not a creative/generative task.
Suggested Lab Tests — based on documented symptoms, doctor approves before it becomes an actual request.
Suggested Questions During Consultation — real-time prompts to the doctor (e.g., "patient mentioned chest pain — consider asking about radiating pain, duration").
Clinical Decision Support — reference-style surfacing of relevant guidelines, explicitly framed as reference material, never a recommendation to act.
AI Follow-up Plan draft — suggests a follow-up cadence based on diagnosis type; doctor approves.
AI Voice Notes — doctor dictates a quick note between consultations, transcribed and attached as draft.
AI Risk Alerts — flags concerning patterns (e.g., repeated ER-adjacent symptoms, medication non-adherence signals) to the doctor for their judgment — never auto-escalates or contacts anyone without doctor/admin action.

Additional AI capability worth adding (team recommendation):

AI No-show / Cancellation Risk Prediction — helps doctors and the platform proactively manage the free-tier abuse and liquidity problems named earlier, by flagging patients/slots at high no-show risk for optional confirmation nudges. This is a genuinely underused idea in existing telemedicine platforms and directly supports a stated business goal (liquidity) rather than being AI-for-AI's-sake.
AI-Assisted Doctor Onboarding — extracts and pre-fills credential data from uploaded certificates/ID to speed up the profile-building cold-start problem discussed in Phase 0, subject to Admin verification.

What I'd deliberately NOT build in V1: any AI feature that produces a diagnosis or treatment recommendation framed as an answer rather than a reference/draft. Given Egypt's currently undefined regulatory position on AI-enabled tools that carry influence on diagnosis, prescribing, or triage decisions requiring explainability and risk classification, shipping anything diagnosis-adjacent without a clear compliance answer is a real risk to the whole platform's legitimacy, not just a feature-level risk. AU Startups

9. Success Metrics
   Patient KPIs: Time-to-first-consultation from signup; repeat consultation rate (your real north star, per Phase 0); average rating; profile completion rate (health data richness correlates with retention and better care).
   Doctor KPIs: Time-to-verification; slot fill rate; consultation completion rate; earnings per active hour; doctor retention (3/6/12-month).
   Platform KPIs: Marketplace liquidity by specialty/region (available doctors vs. patient demand); consultation completion rate (booked → actually happened); AI suggestion acceptance rate (a proxy for whether AI features are actually trusted/useful, not vanity usage).
   Business KPIs: GMV (gross consultation value), take rate, CAC by channel, LTV by patient persona (chronic care vs. one-off), doctor supply growth rate, free-to-paid conversion (patients who start on free consultations and later book paid ones — a meaningful funnel if free tier is designed as an acquisition mechanism, not just charity).

10. Version 1.0 Release Checklist

Doctor Syndicate license verification pipeline operational (manual review acceptable initially, but process must exist and be enforced)
Data residency architecture confirmed compliant with MoH hosting requirements before any patient data is stored
Consent management (per-doctor data sharing, recording consent) implemented and tested, not deferred
Video infrastructure load- and failure-tested under realistic Egyptian mobile network conditions (not just office wifi)
Payment gateway integrated with a licensed local PSP supporting EGP and mobile wallets
All AI features gated behind explicit doctor approval with no auto-write path to the medical record — verified by code review/QA, not just policy
Audit logging live on every PHI access path
Arabic RTL fully implemented and tested, not partial
Legal review completed on: e-prescription process, recording/consent language, terms of service defining platform liability position, malpractice/liability disclaimers
Free-tier abuse controls (no-show strikes, monthly caps) implemented before public launch, not added reactively after abuse is observed
Doctor cold-start plan defined (how the first 50–100 doctors get onboarded/verified before public patient launch)

Missing Opportunities

Diaspora-doctor angle — Egypt is actively building exactly this at a national level right now, connecting Egyptian doctors abroad to patients at home under UHIS. A private platform ignoring this trend is missing a real differentiator; partnering or explicitly positioning alongside it (rather than only competing with it) could be a smarter GTM move than pure organic doctor acquisition. Intelehealth
UHIS-readiness as a moat — even without integrating now, designing your data model to be UHIS/interoperability-ready (ICD-11 coding, etc.) positions you for eventual public-sector partnership rather than being locked out later.

Potential Risks (Beyond Phase 0's List)

Regulatory ambiguity cuts both ways: it's currently loose enough to launch, but a sudden formal telemedicine law could impose requirements (specific licensing, specific data handling) that force a costly retrofit. Build compliance-flexible, not compliance-minimal.
"LinkedIn for doctors" is a nice narrative but risks becoming a ghost-town profile layer if doctors don't have a reason to invest in it beyond the bookings themselves — needs a deliberate content/incentive strategy, not just the feature existing.

Product Recommendations

Ship as a mobile-responsive PWA before native apps — in a market with real infrastructure variance (per the earlier research, rural internet penetration is notably lower than urban), a lighter, more resilient web experience may actually serve patients better than a heavy native app initially.
Treat the free/paid doctor toggle as two distinct discovery experiences, not one filter, to avoid the supply-imbalance risk named repeatedly above.

Features I'd Remove From V1 (as scoped in your brief)

Controlled-substance prescribing — legally too ambiguous right now, remove entirely from V1.
Real-time AI translation during live consultations — accuracy risk in a clinical context is too high for V1; keep as a clearly-flagged future/advanced feature.
Full lab and pharmacy modules — correctly already out of scope per your instructions; I'm reinforcing that this was the right call.

Features I'd Add

No-show risk prediction (detailed in Section 8) — directly serves your stated business goals.
AI-assisted doctor onboarding to ease the cold-start problem.
A structured "second opinion" consultation type — a natural monetizable extension of your continuity-of-care differentiator that most competitors don't do well.

What Would Make This Feel Truly World-Class
Not more features — restraint and trust engineering. The platforms that win in healthcare (versus the many that have quietly failed) succeed because every interaction reinforces "this is a real, safe, professional medical experience," not because they have the most AI checkboxes. The single highest-leverage investment for "world-class" isn't a feature on this list — it's operational rigor in doctor verification and an honest, unhurried compliance posture, because in healthcare, trust is the product.

Ready for Phase 2: System Architecture whenever you are — that's where the data residency, multi-region, and scalability trade-offs get resolved concretely (which services live where, how we isolate Egypt-resident PHI while keeping the rest of the stack globally deployable).
