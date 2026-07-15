Sprint 0

- Workspace
- Docker
- PostgreSQL
- Redis
- Prisma

Sprint 1

- Identity (domain, application, infrastructure, REST API)
- Authentication (deferred — see Sprint 15; landed as a first-party JWT/
  argon2/session implementation, not Keycloak, per docs/14-adrs.md ADR-005)

Sprint 2 — DoctorModule

- Domain
- Application
- Infrastructure
- REST API

Sprint 3 — AssetModule

- File upload
- Storage abstraction
- Document metadata

Sprint 4 — TrustModule

- Doctor verification
- VerificationCase
- Review workflow
- Administration integration

Sprint 5 — AdministrationModule

Sprint 6

- Patient Profile

Sprint 7 — SchedulingModule

- AvailabilityWindow
- Slot reservation
- Slot release
- Slot confirmation

Sprint 8 — ConsultationModule

- Appointment aggregate
- Booking workflow
- ConsultationSession
- SessionConnectionLog
- Scheduling integration

Sprint 9 — PaymentModule

- PaymentTransaction
- Payment authorization
- Payment status
- Transaction lifecycle
- Consultation integration

Sprint 10 — ClinicalModule

- Health Graph
- Health Journey
- Clinical Notes
- Diagnosis nodes
- Minimum clinical context required by downstream modules

Sprint 11 — Prescription

- Prescription aggregate
- Prescription workflow
- ClinicalModule integration

Sprint 12 — AI Copilot

- AI suggestions
- Clinical context integration
- Health Graph integration

Sprint 15 — AuthenticationModule (no Keycloak)

- Credential, Session, AuthToken (domain, application, infrastructure, REST API)
- First-party JWT access tokens + rotated opaque refresh tokens (httpOnly
  cookie, reuse detection), argon2id password hashing, account lockout
- TrustModule's SecurityEvent implemented (was documented, never built)
- Identity narrowed to Account/Profile/Role only (keycloakId dropped)
- docs/14-adrs.md ADR-005/ADR-006
