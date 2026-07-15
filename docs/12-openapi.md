# Phase 11 — OpenAPI Contract Specification
openapi: 3.1.0

info:
title: Orivex — AI-Powered Healthcare Platform
version: "1.0.0"
description: |
Official API contract for the Orivex — AI-Powered Healthcare Platform — patient
Health Passport, doctor Portfolio and Workspace, consultation and clinical
domains, AI Copilot, payments, knowledge, and trust/consent management.

    ## Conventions
    - All timestamps are ISO 8601, UTC.
    - All identifiers are UUIDs (v4/v7).
    - Pagination is cursor-based for growing collections.
    - Every state-changing endpoint on booking, payment, and prescription
      resources requires an `Idempotency-Key` header.
    - AI-generated content is always a draft; see `AIMetadata` on any
      resource that may include one, and `requiresAcknowledgment` for
      safety-critical suggestions that must be explicitly actioned before
      dependent actions (e.g. signing a prescription) are permitted.
    - Errors follow the single `ErrorResponse` envelope described below,
      regardless of endpoint.

contact:
name: Orivex — AI-Powered Healthcare Platform
email: api-support@Orivex.health
license:
name: Proprietary
identifier: LicenseRef-Orivex-Proprietary

servers:

- url: https://api.Orivex.health/api/v1
  description: Production (Egypt region)
- url: https://staging-api.Orivex.health/api/v1
  description: Staging
- url: https://sandbox-api.Orivex.health/api/v1
  description: Developer sandbox (synthetic data only)

# ============================================================

# TAGS

# ============================================================

tags:

- name: Authentication
  description: Account creation, login, session and token management.
- name: Patients
  description: Patient account profile and Health Passport container data.
- name: Doctors
  description: Doctor professional identity, Portfolio, and availability.
- name: Verification
  description: Doctor credential verification workflow.
- name: Consent
  description: Patient consent grants, scopes, and revocation.
- name: Scheduling
  description: Appointment booking, rescheduling, and slot management.
- name: Consultations
  description: Live/occurred consultation session lifecycle.
- name: Clinical
  description: Health Graph, Health Journeys, Clinical Notes, Observations, Referrals.
- name: Prescriptions
  description: Prescription authoring and signing.
- name: Diagnostics
  description: Lab and radiology requests and results.
- name: Knowledge
  description: Knowledge Center articles, follows, and saves.
- name: Media
  description: File and media asset upload lifecycle.
- name: Payments
  description: Transactions and doctor payouts.
- name: Notifications
  description: Notification delivery records and preferences.
- name: AI
  description: AI Copilot suggestion generation and doctor decisions.
- name: Audit
  description: Immutable audit log access (admin only).
- name: Configuration
  description: Feature flags and platform business-rule parameters (admin only).
- name: Reference Data
  description: Specialties, ICD-11 codes, drug catalog, and other shared vocabularies.
- name: Analytics
  description: Doctor and platform derived analytics.
- name: Administration
  description: Moderation cases and platform operations.

# ============================================================

# SECURITY SCHEMES

# ============================================================

components:
securitySchemes:
BearerAuth:
type: http
scheme: bearer
bearerFormat: JWT
description: |
Short-lived JWT access token. Carries `accountId` and `role` claims
only — never PHI or business data. Obtained via /auth/login or
refreshed via /auth/refresh.
RefreshTokenAuth:
type: apiKey
in: cookie
name: orivex_refresh_token
description: |
Long-lived, rotated-on-use refresh token, revocable server-side
(reuse detection: presenting an already-rotated token revokes every
session for that credential). httpOnly, Secure+SameSite=None in
production (cross-site frontend/backend), Lax in local dev. Read
implicitly by /auth/refresh, /auth/logout, /auth/change-password —
not modeled as a per-operation `security:` requirement since it's
read directly from the cookie, not asserted as a bearer credential.
OAuth2ThirdParty:
type: oauth2
description: |
Reserved for future third-party API access (Phase 4/10's API-access
revenue line). Not used by first-party clients in V1.
flows:
authorizationCode:
authorizationUrl: https://api.clinexa.health/oauth/authorize
tokenUrl: https://api.clinexa.health/oauth/token
scopes:
"patients:read": Read patient-authorized data
"appointments:write": Create/modify appointments
"clinical:read": Read clinical data (subject to consent)
"knowledge:read": Read published Knowledge content

# ============================================================

# PARAMETERS

# ============================================================

parameters:
IdempotencyKey:
name: Idempotency-Key
in: header
required: true
description: Client-generated unique key preventing duplicate execution of a retried request.
schema:
type: string
format: uuid
CorrelationId:
name: X-Request-Id
in: header
required: false
description: Client-supplied correlation ID; server-generated if absent. Propagated to the resulting Audit Log Entry.
schema:
type: string
format: uuid
AcceptLanguage:
name: Accept-Language
in: header
required: false
schema:
type: string
example: ar-EG
PathId:
name: id
in: path
required: true
schema:
type: string
format: uuid
CursorParam:
name: cursor
in: query
required: false
schema:
type: string
description: Opaque pagination cursor from a previous response's `pagination.nextCursor`.
LimitParam:
name: limit
in: query
required: false
schema:
type: integer
minimum: 1
maximum: 100
default: 20
SortParam:
name: sort
in: query
required: false
schema:
type: string
description: Field to sort by; prefix with `-` for descending, e.g. `-createdAt`.
SearchParam:
name: q
in: query
required: false
schema:
type: string
description: Free-text search, combinable with structured filters.
IncludeParam:
name: include
in: query
required: false
schema:
type: array
items:
type: string
style: form
explode: false
description: Optional related resources to embed, e.g. `include=doctor,paymentTransaction`.
FieldsParam:
name: fields
in: query
required: false
schema:
type: string
description: Comma-separated subset of fields to return (bandwidth-conscious clients).

# ============================================================

# HEADERS

# ============================================================

headers:
Deprecation:
description: Present on deprecated endpoints/fields.
schema:
type: string
format: date
Sunset:
description: Date after which a deprecated endpoint will be removed (RFC 8594).
schema:
type: string
format: date
RateLimitLimit:
schema: { type: integer }
RateLimitRemaining:
schema: { type: integer }
RetryAfter:
schema: { type: integer }

# ============================================================

# SCHEMAS

# ============================================================

schemas:

    # ---- Envelope & shared primitives ----
    ResponseMeta:
      type: object
      properties:
        requestId: { type: string, format: uuid }
        timestamp: { type: string, format: date-time }

    AuthenticatedUser:
      type: object
      description: Matches apps/frontend/src/shared/auth/types.ts's AuthenticatedUser shape exactly. roles is an array for frontend contract compatibility (it originally modeled a speculative multi-role Keycloak claim); the real backend has exactly one role per account, so this is always a single-element array.
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        fullName: { type: string }
        roles:
          type: array
          items: { type: string, enum: [patient, doctor, admin] }
          minItems: 1
          maxItems: 1

    Pagination:
      type: object
      properties:
        nextCursor: { type: string, nullable: true }
        previousCursor: { type: string, nullable: true }
        hasMore: { type: boolean }
        totalCount:
          type: integer
          nullable: true
          description: Omitted/null when exact counting is expensive on large tables (e.g. audit logs).

    Warning:
      type: object
      properties:
        code: { type: string }
        message: { type: string }
        severity:
          type: string
          enum: [info, advisory]

    AIMetadata:
      type: object
      description: Present on any response containing or derived from AI Copilot output.
      properties:
        suggestionId: { type: string, format: uuid }
        suggestionType:
          type: string
          enum: [soap_draft, prescription_draft, interaction_flag, suggested_question, summary, follow_up_plan]
        confidenceScore:
          type: number
          minimum: 0
          maximum: 1
          nullable: true
        promptVersion: { type: string }
        requiresAcknowledgment: { type: boolean }
      additionalProperties: true
      description: |
        Deliberately open/additive (per Phase 10's versioning note) so new
        AI metadata fields can be added without a breaking change.

    AuditMetadata:
      type: object
      properties:
        actorAccountId: { type: string, format: uuid, nullable: true }
        actionType:
          type: string
          enum: [read, create, update, state_transition, approve, reject]
        reason: { type: string, nullable: true }
        createdAt: { type: string, format: date-time }

    Money:
      type: object
      properties:
        amount: { type: number }
        currency:
          type: string
          example: EGP
      required: [amount, currency]

    ReferenceDataItem:
      type: object
      properties:
        code: { type: string }
        label: { type: string }
        category: { type: string, nullable: true }
      required: [code, label]

    Address:
      type: object
      properties:
        city: { type: string }
        countryCode: { type: string, example: EG }

    # ---- Error model ----
    ErrorDetail:
      type: object
      properties:
        field: { type: string, nullable: true }
        code: { type: string }
        message: { type: string }

    ErrorResponse:
      type: object
      properties:
        error:
          type: object
          properties:
            code: { type: string }
            message: { type: string }
            details:
              type: array
              items: { $ref: '#/components/schemas/ErrorDetail' }
            requestId: { type: string, format: uuid }
            timestamp: { type: string, format: date-time }
          required: [code, message]
      required: [error]

    # ---- Summaries (lightweight, list-friendly) ----
    PatientSummary:
      type: object
      properties:
        id: { type: string, format: uuid }
        displayName: { type: string }
        age: { type: integer, nullable: true }

    DoctorSummary:
      type: object
      properties:
        id: { type: string, format: uuid }
        displayName: { type: string }
        specialty: { $ref: '#/components/schemas/ReferenceDataItem' }
        verified: { type: boolean }
        nextAvailableSlot: { type: string, format: date-time, nullable: true }
        offersFree: { type: boolean }
        offersPaid: { type: boolean }
        priceFrom: { $ref: '#/components/schemas/Money', nullable: true }
        rating:
          type: number
          nullable: true
          minimum: 0
          maximum: 5

    AppointmentSummary:
      type: object
      properties:
        id: { type: string, format: uuid }
        patient: { $ref: '#/components/schemas/PatientSummary' }
        doctor: { $ref: '#/components/schemas/DoctorSummary' }
        scheduledAt: { type: string, format: date-time }
        consultationType:
          type: string
          enum: [free, paid]
        status:
          type: string
          enum: [requested, confirmed, rescheduled, cancelled, no_show, completed]

    ConsultationSummary:
      type: object
      properties:
        id: { type: string, format: uuid }
        appointmentId: { type: string, format: uuid }
        state:
          type: string
          enum: [waiting_room, in_progress, completed, interrupted, closed, emergency_escalation]
        startedAt: { type: string, format: date-time, nullable: true }
        closedAt: { type: string, format: date-time, nullable: true }

    PrescriptionLineItem:
      type: object
      properties:
        drugCatalogId: { type: string, format: uuid }
        drugName: { type: string }
        dosage: { type: string }
        frequency: { type: string }
        durationDays: { type: integer }
        instructions: { type: string, nullable: true }
      required: [drugCatalogId, dosage, frequency, durationDays]

    PrescriptionSummary:
      type: object
      properties:
        id: { type: string, format: uuid }
        consultationSessionId: { type: string, format: uuid }
        diagnosisNodeId: { type: string, format: uuid }
        status:
          type: string
          enum: [draft, signed, active, expired, superseded]
        lineItems:
          type: array
          items: { $ref: '#/components/schemas/PrescriptionLineItem' }
        signedAt: { type: string, format: date-time, nullable: true }
        derivedFromSuggestionId: { type: string, format: uuid, nullable: true }
        aiMetadata:
          allOf:
            - $ref: '#/components/schemas/AIMetadata'
          nullable: true

    HealthGraphNode:
      type: object
      properties:
        id: { type: string, format: uuid }
        nodeType:
          type: string
          enum: [condition, symptom, medication, lab_result, radiology_result]
        icd11Code: { $ref: '#/components/schemas/ReferenceDataItem', nullable: true }
        description: { type: string, nullable: true }
        certaintyLevel:
          type: string
          enum: [suspected, confirmed, ruled_out]
        source:
          type: string
          enum: [clinical, patient_reported, device]
        createdAt: { type: string, format: date-time }

    HealthJourney:
      type: object
      properties:
        id: { type: string, format: uuid }
        rootNode: { $ref: '#/components/schemas/HealthGraphNode' }
        stage:
          type: string
          enum: [diagnosis, follow_up, monitoring, resolved, ongoing_chronic, referred_out]
        linkedNodeIds:
          type: array
          items: { type: string, format: uuid }
        lastUpdatedAt: { type: string, format: date-time }

    ClinicalNote:
      type: object
      properties:
        id: { type: string, format: uuid }
        consultationSessionId: { type: string, format: uuid }
        content: { type: string }
        addendumOfNoteId: { type: string, format: uuid, nullable: true }
        aiMetadata:
          allOf:
            - $ref: '#/components/schemas/AIMetadata'
          nullable: true
        createdAt: { type: string, format: date-time }

    ConsentRecord:
      type: object
      properties:
        id: { type: string, format: uuid }
        patientId: { type: string, format: uuid }
        doctorId: { type: string, format: uuid, nullable: true }
        scopeCategory: { type: string }
        state:
          type: string
          enum: [granted, revoked]
        versionNumber: { type: integer }
        effectiveAt: { type: string, format: date-time }

    VerificationCase:
      type: object
      properties:
        id: { type: string, format: uuid }
        doctorId: { type: string, format: uuid }
        status:
          type: string
          enum: [submitted, under_review, approved, rejected, more_info_needed, re_verification_due, suspended]
        submittedAt: { type: string, format: date-time }
        decidedAt: { type: string, format: date-time, nullable: true }

    KnowledgeArticle:
      type: object
      properties:
        id: { type: string, format: uuid }
        doctorId: { type: string, format: uuid }
        title: { type: string }
        body: { type: string }
        status:
          type: string
          enum: [draft, pre_review, published, flagged, archived, needs_update]
        publishedAt: { type: string, format: date-time, nullable: true }

    MediaAsset:
      type: object
      properties:
        id: { type: string, format: uuid }
        purpose:
          type: string
          enum: [clinical_attachment, doctor_certificate, profile_image, knowledge_media, lab_report]
        contentType: { type: string }
        status:
          type: string
          enum: [pending, confirmed, rejected]
        signedUrl: { type: string, format: uri, nullable: true }

    PaymentTransaction:
      type: object
      properties:
        id: { type: string, format: uuid }
        consultationSessionId: { type: string, format: uuid, nullable: true }
        amount: { $ref: '#/components/schemas/Money' }
        status:
          type: string
          enum: [initiated, succeeded, failed, settled, refunded, disputed]
        createdAt: { type: string, format: date-time }

    AISuggestion:
      type: object
      properties:
        id: { type: string, format: uuid }
        consultationSessionId: { type: string, format: uuid }
        suggestionType:
          type: string
          enum: [soap_draft, prescription_draft, interaction_flag, suggested_question, summary, follow_up_plan]
        content: { type: string }
        confidenceScore: { type: number, nullable: true }
        safetyFlags:
          type: array
          items: { type: string }
        requiresAcknowledgment: { type: boolean }
        doctorDecision:
          type: string
          enum: [approved, edited, rejected]
          nullable: true
        decisionJustification: { type: string, nullable: true }
        generatedAt: { type: string, format: date-time }

# ============================================================

# REQUEST BODIES

# ============================================================

requestBodies:
BookAppointment:
required: true
content:
application/json:
schema:
type: object
properties:
doctorId: { type: string, format: uuid }
availabilityWindowId: { type: string, format: uuid }
consultationType: { type: string, enum: [free, paid] }
reasonForVisit: { type: string, nullable: true }
linkedJourneyId: { type: string, format: uuid, nullable: true }
required: [doctorId, availabilityWindowId, consultationType]
examples:
followUp:
summary: Booking a follow-up linked to an existing Journey
value:
doctorId: "b3c1a2e4-1111-4a2b-9c3d-000000000001"
availabilityWindowId: "b3c1a2e4-2222-4a2b-9c3d-000000000002"
consultationType: paid
reasonForVisit: "Hypertension follow-up, requesting BP review"
linkedJourneyId: "b3c1a2e4-3333-4a2b-9c3d-000000000003"

    SignPrescription:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              consultationSessionId: { type: string, format: uuid }
              diagnosisNodeId: { type: string, format: uuid }
              derivedFromSuggestionId: { type: string, format: uuid, nullable: true }
              lineItems:
                type: array
                items: { $ref: '#/components/schemas/PrescriptionLineItem' }
            required: [consultationSessionId, diagnosisNodeId, lineItems]
          examples:
            standard:
              summary: Signing a prescription derived from an approved AI draft
              value:
                consultationSessionId: "c1d2e3f4-1111-4a2b-9c3d-000000000010"
                diagnosisNodeId: "c1d2e3f4-2222-4a2b-9c3d-000000000011"
                derivedFromSuggestionId: "c1d2e3f4-3333-4a2b-9c3d-000000000012"
                lineItems:
                  - drugCatalogId: "d1e2f3a4-0000-4a2b-9c3d-000000000020"
                    drugName: "Amlodipine 5mg"
                    dosage: "5mg"
                    frequency: "once daily"
                    durationDays: 30
                    instructions: "Take in the morning"

    GrantOrRevokeConsent:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              doctorId: { type: string, format: uuid, nullable: true }
              scopeCategory: { type: string }
              action: { type: string, enum: [grant, revoke] }
              legalBasisVersion: { type: string }
            required: [scopeCategory, action, legalBasisVersion]

# ============================================================

# RESPONSES (reusable)

# ============================================================

responses:
BadRequest:
description: Validation error.
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }
example:
error: { code: VALIDATION_FAILED, message: "Request body failed validation.", details: [{ field: "reasonForVisit", code: TOO_LONG, message: "Must be under 1000 characters." }], requestId: "e0000000-0000-0000-0000-000000000001", timestamp: "2026-07-07T10:00:00Z" }
Unauthenticated:
description: Missing or invalid credentials.
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }
Forbidden:
description: Authenticated but not authorized, or consent not granted.
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }
example:
error: { code: CONSENT_NOT_GRANTED, message: "This doctor does not have consent to view the requested data.", requestId: "e0000000-0000-0000-0000-000000000002", timestamp: "2026-07-07T10:00:00Z" }
NotFound:
description: Resource does not exist.
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }
Conflict:
description: Concurrency or state conflict (e.g. slot already booked).
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }
example:
error: { code: SLOT_ALREADY_BOOKED, message: "This slot was booked by another patient.", requestId: "e0000000-0000-0000-0000-000000000003", timestamp: "2026-07-07T10:00:00Z" }
UnprocessableEntity:
description: Business rule violation or blocking medical safety warning.
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }
example:
error: { code: UNACKNOWLEDGED_INTERACTION_WARNING, message: "An unacknowledged drug interaction warning exists for this consultation.", requestId: "e0000000-0000-0000-0000-000000000004", timestamp: "2026-07-07T10:00:00Z" }
TooManyRequests:
description: Rate limit exceeded.
headers:
Retry-After: { $ref: '#/components/headers/RetryAfter' }
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }
InternalError:
description: Unexpected server error. No internal detail is leaked.
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }

paths:

# ============================================================

# AUTHENTICATION

# ============================================================

Note (Sprint 15): the six /auth/* paths below reflect AuthenticationModule's
real, implemented contract (apps/backend/src/modules/authentication) — no
longer the pre-implementation Keycloak-era speculation this section
originally held (credential/password/role fields, accessToken/expiresIn-only
responses). Field names/casing match apps/frontend/src/features/auth/api/
types.ts exactly, since that frontend was built against this exact shape.
Error codes (INVALID_CREDENTIALS, ACCOUNT_LOCKED, EMAIL_NOT_VERIFIED,
TOKEN_INVALID, TOKEN_EXPIRED) appear as ErrorResponse.error.code, not as
distinct HTTP statuses beyond the ones noted per endpoint.

/auth/register:
post:
tags: [Authentication]
operationId: register
summary: Create a new Patient account (self-service registration)
description: Always creates a Patient-role account; Doctor/Admin accounts are provisioned through the administrative/verification flow, not self-service registration. Sends an email-verification token (logged server-side only — no real email provider is wired up yet, docs/14-adrs.md ADR-005).
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
fullName: { type: string }
email: { type: string, format: email }
password: { type: string, format: password, description: 'Minimum 10 characters, at least one uppercase, one lowercase, one digit.' }
required: [fullName, email, password]
responses:
'201':
description: Verification email sent.
content:
application/json:
schema:
type: object
properties:
data: { type: object, properties: { status: { type: string, enum: [verification_required] }, email: { type: string } } }
meta: { $ref: '#/components/schemas/ResponseMeta' }
'409': { $ref: '#/components/responses/Conflict' }
'422': { $ref: '#/components/responses/BadRequest' }

/auth/login:
post:
tags: [Authentication]
operationId: login
summary: Authenticate and obtain an access token + refresh-token cookie
description: Rate-limited to 5 requests/minute per docs/10-backend-architecture.md Section 10. Sets an httpOnly, rotated refresh-token cookie (SameSite=None+Secure in production, Lax in local dev) — never returns the refresh token in the response body.
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
email: { type: string, format: email }
password: { type: string, format: password }
rememberMe: { type: boolean, description: 'Accepted for frontend contract compatibility; does not yet vary refresh-token lifetime.' }
required: [email, password]
responses:
'200':
description: Authenticated.
content:
application/json:
schema:
type: object
properties:
data:
type: object
properties:
user: { $ref: '#/components/schemas/AuthenticatedUser' }
accessToken: { type: string }
accessTokenExpiresAt: { type: string, format: date-time }
mfaRequired: { type: boolean, description: 'Always false — MFA is not implemented.' }
'401': { description: 'INVALID_CREDENTIALS or ACCOUNT_LOCKED (see error.code).' }
'403': { description: 'EMAIL_NOT_VERIFIED (see error.code).' }

/auth/logout:
post:
tags: [Authentication]
operationId: logout
summary: Revoke the current session and clear the refresh-token cookie
description: Idempotent — no cookie, an unknown token, or an already-revoked session all resolve 204, never an error.
responses:
'204': { description: Logged out (idempotent). }

/auth/refresh:
post:
tags: [Authentication]
operationId: refreshSession
summary: Rotate the refresh-token cookie and obtain a new access token
description: Reads the refresh token from the httpOnly cookie only (no request body). Reuse of an already-rotated/revoked refresh token revokes every session for that credential and is recorded as a REFRESH_TOKEN_REUSE_DETECTED security event (docs/09-physical-database.md's security_events table).
responses:
'200':
description: New access token + rotated refresh-token cookie issued.
content:
application/json:
schema:
type: object
properties:
data: { type: object, properties: { accessToken: { type: string }, accessTokenExpiresAt: { type: string, format: date-time } } }
'401': { description: 'TOKEN_INVALID or TOKEN_EXPIRED (see error.code).' }

/auth/forgot-password:
post:
tags: [Authentication]
operationId: forgotPassword
summary: Request a password-reset token
description: Always resolves 200 regardless of whether the email matches an account — never reveals account existence. Rate-limited to 3 requests/minute.
requestBody:
required: true
content:
application/json:
schema:
type: object
properties: { email: { type: string, format: email } }
required: [email]
responses:
'200':
description: Always sent (or silently no-op'd for an unknown email).
content:
application/json:
schema:
type: object
properties:
data: { type: object, properties: { status: { type: string, enum: [sent] } } }

/auth/reset-password:
post:
tags: [Authentication]
operationId: resetPassword
summary: Reset the password using a token from forgot-password
description: Single-use token. On success, revokes every existing session for the credential (a reset invalidates all prior sessions, not just the requesting one).
requestBody:
required: true
content:
application/json:
schema:
type: object
properties: { token: { type: string }, password: { type: string, format: password } }
required: [token, password]
responses:
'200':
description: Password reset.
content:
application/json:
schema:
type: object
properties:
data: { type: object, properties: { status: { type: string, enum: [reset] } } }
'401': { description: 'TOKEN_INVALID or TOKEN_EXPIRED (see error.code).' }

/auth/verify-email:
post:
tags: [Authentication]
operationId: verifyEmail
summary: Verify an account's email using the token from registration
requestBody:
required: true
content:
application/json:
schema:
type: object
properties: { token: { type: string } }
required: [token]
responses:
'200':
description: Email verified.
content:
application/json:
schema:
type: object
properties:
data: { type: object, properties: { status: { type: string, enum: [verified] } } }
'401': { description: 'TOKEN_INVALID or TOKEN_EXPIRED (see error.code).' }

/auth/change-password:
post:
tags: [Authentication]
operationId: changePassword
summary: Change the authenticated user's password
security: - BearerAuth: []
description: Requires the current password. Revokes every other session, keeping only the one making this request alive.
requestBody:
required: true
content:
application/json:
schema:
type: object
properties: { currentPassword: { type: string, format: password }, newPassword: { type: string, format: password } }
required: [currentPassword, newPassword]
responses:
'200':
description: Password changed.
content:
application/json:
schema:
type: object
properties:
data: { type: object, properties: { status: { type: string, enum: [changed] } } }
'401': { $ref: '#/components/responses/Unauthenticated' }

/auth/me:
get:
tags: [Authentication]
operationId: getCurrentUser
summary: Get the currently authenticated user
security: - BearerAuth: []
responses:
'200':
description: Current user.
content:
application/json:
schema:
type: object
properties:
data: { type: object, properties: { user: { $ref: '#/components/schemas/AuthenticatedUser' } } }
'401': { $ref: '#/components/responses/Unauthenticated' }

/auth/session:
get:
tags: [Authentication]
operationId: getSession
summary: Silent session check (never 401)
description: Thin alias backing the frontend's session-bootstrap flow — unlike /auth/me, an absent/expired token resolves 200 with data null, never a 401.
responses:
'200':
description: Current session, or null if unauthenticated.
content:
application/json:
schema:
type: object
properties:
data:
oneOf: - { type: object, properties: { user: { $ref: '#/components/schemas/AuthenticatedUser' } } } - { type: 'null' }

# ============================================================

# DOCTORS / DISCOVERY

# ============================================================

/doctors:
get:
tags: [Doctors]
operationId: searchDoctors
summary: Search and filter verified doctors (public discovery)
description: |
Public endpoint. Supports structured filters and free-text search
(combinable, per Phase 10 §8). Free and paid doctors are returned
in non-competing lanes on the frontend, per Phase 1's discovery rule.
parameters: - $ref: '#/components/parameters/SearchParam' - $ref: '#/components/parameters/SortParam' - $ref: '#/components/parameters/CursorParam' - $ref: '#/components/parameters/LimitParam' - name: specialty
in: query
schema: { type: string } - name: offersFree
in: query
schema: { type: boolean } - name: language
in: query
schema: { type: string }
responses:
'200':
description: Paginated list of matching doctors.
content:
application/json:
schema:
type: object
properties:
data:
type: array
items: { $ref: '#/components/schemas/DoctorSummary' }
pagination: { $ref: '#/components/schemas/Pagination' }
meta: { $ref: '#/components/schemas/ResponseMeta' }

/doctors/{id}/portfolio:
get:
tags: [Doctors]
operationId: getDoctorPortfolio
summary: Get a doctor's public professional Portfolio
parameters: - $ref: '#/components/parameters/PathId'
responses:
'200':
description: Public Portfolio.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/DoctorSummary' }
'404': { $ref: '#/components/responses/NotFound' }

/doctors/{id}/verifications:
post:
tags: [Verification]
operationId: submitDoctorVerification
summary: Submit credentials for verification
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId' - $ref: '#/components/parameters/IdempotencyKey'
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
licenseNumber: { type: string }
specialtyCode: { type: string }
documentAssetIds:
type: array
items: { type: string, format: uuid }
required: [licenseNumber, specialtyCode, documentAssetIds]
responses:
'201':
description: Verification case created.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/VerificationCase' }
'422': { $ref: '#/components/responses/UnprocessableEntity' }
'403': { $ref: '#/components/responses/Forbidden' }

/verifications/{id}:
patch:
tags: [Verification]
operationId: decideVerification
summary: Approve, reject, or request more info (admin only)
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId'
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
status: { type: string, enum: [approved, rejected, more_info_needed] }
reason: { type: string, nullable: true }
required: [status]
responses:
'200':
description: Updated verification case.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/VerificationCase' }
'403': { $ref: '#/components/responses/Forbidden' }

# ============================================================

# CONSENT

# ============================================================

/patients/{id}/consents:
post:
tags: [Consent]
operationId: manageConsent
summary: Grant or revoke consent for a doctor/scope
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId' - $ref: '#/components/parameters/IdempotencyKey'
requestBody: { $ref: '#/components/requestBodies/GrantOrRevokeConsent' }
responses:
'201':
description: New versioned consent record created.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/ConsentRecord' }
'403': { $ref: '#/components/responses/Forbidden' }
get:
tags: [Consent]
operationId: listConsents
summary: List a patient's consent history
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId' - $ref: '#/components/parameters/CursorParam' - $ref: '#/components/parameters/LimitParam'
responses:
'200':
description: Paginated consent history.
content:
application/json:
schema:
type: object
properties:
data:
type: array
items: { $ref: '#/components/schemas/ConsentRecord' }
pagination: { $ref: '#/components/schemas/Pagination' }

# ============================================================

# SCHEDULING / APPOINTMENTS

# ============================================================

/appointments:
post:
tags: [Scheduling]
operationId: bookAppointment
summary: Book an appointment
description: |
Requires an Idempotency-Key. Server re-validates slot availability,
free-tier monthly cap, and doctor's offered consultation type
regardless of client-supplied values (Phase 10 §5).
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/IdempotencyKey'
requestBody: { $ref: '#/components/requestBodies/BookAppointment' }
responses:
'201':
description: Appointment confirmed.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/AppointmentSummary' }
'402':
description: Payment required and not yet completed.
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }
'409': { $ref: '#/components/responses/Conflict' }
'422': { $ref: '#/components/responses/UnprocessableEntity' }
get:
tags: [Scheduling]
operationId: listAppointments
summary: List the caller's appointments
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/CursorParam' - $ref: '#/components/parameters/LimitParam' - $ref: '#/components/parameters/SortParam' - $ref: '#/components/parameters/IncludeParam' - name: status
in: query
schema: { type: string }
responses:
'200':
description: Paginated appointment list.
content:
application/json:
schema:
type: object
properties:
data:
type: array
items: { $ref: '#/components/schemas/AppointmentSummary' }
pagination: { $ref: '#/components/schemas/Pagination' }

/appointments/{id}:
patch:
tags: [Scheduling]
operationId: rescheduleOrCancelAppointment
summary: Reschedule or cancel an appointment
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId' - $ref: '#/components/parameters/IdempotencyKey'
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
action: { type: string, enum: [reschedule, cancel] }
newAvailabilityWindowId: { type: string, format: uuid, nullable: true }
required: [action]
responses:
'200':
description: Updated appointment. Refund eligibility, if any, is reflected in a `warnings[]` or business-rule field per the cancellation-window policy.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/AppointmentSummary' }
warnings:
type: array
items: { $ref: '#/components/schemas/Warning' }
'409': { $ref: '#/components/responses/Conflict' }

# ============================================================

# CONSULTATIONS

# ============================================================

/consultations/{id}/start:
post:
tags: [Consultations]
operationId: startConsultation
summary: Begin the live consultation session
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId' - $ref: '#/components/parameters/IdempotencyKey'
responses:
'200':
description: Session transitioned to in_progress.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/ConsultationSummary' }
'409': { $ref: '#/components/responses/Conflict' }

/consultations/{id}/close:
post:
tags: [Consultations]
operationId: closeConsultation
summary: Close the consultation session (doctor only)
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId'
requestBody:
content:
application/json:
schema:
type: object
properties:
completionReason:
type: string
enum: [completed, interrupted_technical, interrupted_other]
required: [completionReason]
responses:
'200':
description: Session closed; triggers ConsultationCompleted or ConsultationInterrupted event downstream.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/ConsultationSummary' }
'403': { $ref: '#/components/responses/Forbidden' }

/consultations/{id}/notes:
post:
tags: [Clinical]
operationId: createClinicalNote
summary: Author a clinical note (treating doctor only)
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId' - $ref: '#/components/parameters/IdempotencyKey'
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
content: { type: string }
addendumOfNoteId: { type: string, format: uuid, nullable: true }
derivedFromSuggestionId: { type: string, format: uuid, nullable: true }
required: [content]
responses:
'201':
description: Note created. Immutable once the parent consultation is closed.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/ClinicalNote' }
'403': { $ref: '#/components/responses/Forbidden' }

# ============================================================

# CLINICAL — HEALTH GRAPH / JOURNEYS

# ============================================================

/patients/{id}/health-graph:
get:
tags: [Clinical]
operationId: getHealthGraphSubgraph
summary: Retrieve a scoped Health Graph subgraph
description: |
Requires either the caller to be the patient, or an active doctor
consent for the requested scope. Response is deliberately scoped
(not the full history) via `include`/tier parameters to avoid an
unbounded payload as clinical history grows (Phase 10 §15).
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId' - name: rootNodeId
in: query
schema: { type: string, format: uuid }
description: Optional — scope the traversal to a specific condition's connected nodes. - name: tier
in: query
schema: { type: string, enum: [summary, full] }
description: 'summary = Tier 1/2 only (current meds, allergies, active Journeys); full = Tier 3 explore-connections view.'
responses:
'200':
description: Scoped Health Graph nodes/edges.
content:
application/json:
schema:
type: object
properties:
data:
type: array
items: { $ref: '#/components/schemas/HealthGraphNode' }
'403': { $ref: '#/components/responses/Forbidden' }

/patients/{id}/journeys:
get:
tags: [Clinical]
operationId: listHealthJourneys
summary: List a patient's Health Journeys
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId' - name: status
in: query
schema: { type: string }
responses:
'200':
description: List of Journeys.
content:
application/json:
schema:
type: object
properties:
data:
type: array
items: { $ref: '#/components/schemas/HealthJourney' }
'403': { $ref: '#/components/responses/Forbidden' }

/referrals:
post:
tags: [Clinical]
operationId: createReferral
summary: Create a referral to care outside the platform
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/IdempotencyKey'
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
journeyId: { type: string, format: uuid }
targetSpecialtyCode: { type: string }
reason: { type: string }
required: [journeyId, targetSpecialtyCode, reason]
responses:
'201':
description: Referral recorded; Journey stage set to referred_out.
content:
application/json:
schema:
type: object
properties:
data:
type: object
properties:
id: { type: string, format: uuid }
journeyId: { type: string, format: uuid }
status: { type: string, enum: [open, closed_with_outcome, closed_unknown] }

# ============================================================

# PRESCRIPTIONS

# ============================================================

/prescriptions:
post:
tags: [Prescriptions]
operationId: signPrescription
summary: Sign a prescription (treating doctor only)
description: |
Server re-runs the deterministic drug interaction/allergy check
regardless of any client-side check already shown (Phase 10 §5).
Blocked with 422 if an unacknowledged Warning-tier AI suggestion
exists for this consultation.
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/IdempotencyKey'
requestBody: { $ref: '#/components/requestBodies/SignPrescription' }
responses:
'201':
description: Prescription signed (immutable).
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/PrescriptionSummary' }
'422': { $ref: '#/components/responses/UnprocessableEntity' }
'403': { $ref: '#/components/responses/Forbidden' }

/prescriptions/{id}:
get:
tags: [Prescriptions]
operationId: getPrescription
summary: Retrieve a prescription
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId'
responses:
'200':
description: Prescription detail.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/PrescriptionSummary' }
'404': { $ref: '#/components/responses/NotFound' }

# ============================================================

# AI COPILOT

# ============================================================

/ai/suggestions:
post:
tags: [AI]
operationId: requestAISuggestion
summary: Request an AI Copilot suggestion (treating doctor, active consultation only)
description: |
Context scoping is always server-determined, never client-supplied.
May respond synchronously (200) for fast suggestion types or
asynchronously (202) for longer-running generation.
security: [{ BearerAuth: [] }]
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
consultationSessionId: { type: string, format: uuid }
suggestionType:
type: string
enum: [soap_draft, prescription_draft, interaction_flag, suggested_question, summary, follow_up_plan]
required: [consultationSessionId, suggestionType]
responses:
'200':
description: Suggestion generated synchronously.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/AISuggestion' }
'202':
description: |
Generation queued. Also used to represent AI-unavailable
degraded mode (see `aiMetadata.requiresAcknowledgment: false`
and a `warnings[]` entry) rather than an HTTP error status,
per Phase 10 §7's deliberate deviation from convention.
content:
application/json:
schema:
type: object
properties:
data:
type: object
properties:
suggestionId: { type: string, format: uuid }
status: { type: string, enum: [queued, unavailable] }
warnings:
type: array
items: { $ref: '#/components/schemas/Warning' }
'403': { $ref: '#/components/responses/Forbidden' }

/ai/suggestions/{id}:
patch:
tags: [AI]
operationId: recordDoctorDecision
summary: Record the doctor's decision on a suggestion
description: Settable exactly once; a second call returns 409.
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId'
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
decision: { type: string, enum: [approved, edited, rejected] }
justification:
type: string
nullable: true
description: Required when rejecting a Warning-tier suggestion.
required: [decision]
responses:
'200':
description: Decision recorded (immutable thereafter).
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/AISuggestion' }
'409':
description: Suggestion already has a recorded decision.
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }
'422': { $ref: '#/components/responses/UnprocessableEntity' }

# ============================================================

# KNOWLEDGE

# ============================================================

/knowledge/articles:
post:
tags: [Knowledge]
operationId: publishArticle
summary: Publish a Knowledge Center article (verified doctors only)
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/IdempotencyKey'
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
title: { type: string }
body: { type: string }
mediaAssetIds:
type: array
items: { type: string, format: uuid }
required: [title, body]
responses:
'201':
description: Published directly, or routed to pre-publication review for new/low-trust-tier doctors.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/KnowledgeArticle' }
'202':
description: Submitted for pre-publication review.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/KnowledgeArticle' }
'403': { $ref: '#/components/responses/Forbidden' }
get:
tags: [Knowledge]
operationId: searchArticles
summary: Search published Knowledge articles (public)
parameters: - $ref: '#/components/parameters/SearchParam' - $ref: '#/components/parameters/CursorParam' - $ref: '#/components/parameters/LimitParam'
responses:
'200':
description: Paginated article list.
content:
application/json:
schema:
type: object
properties:
data:
type: array
items: { $ref: '#/components/schemas/KnowledgeArticle' }
pagination: { $ref: '#/components/schemas/Pagination' }

# ============================================================

# MEDIA ASSETS

# ============================================================

/media-assets/upload-intent:
post:
tags: [Media]
operationId: createUploadIntent
summary: Request a signed direct-to-storage upload URL
security: [{ BearerAuth: [] }]
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
contentType: { type: string }
sizeEstimate: { type: integer }
purpose:
type: string
enum: [clinical_attachment, doctor_certificate, profile_image, knowledge_media, lab_report]
required: [contentType, purpose]
responses:
'201':
description: Signed upload URL issued.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/MediaAsset' }
'403': { $ref: '#/components/responses/Forbidden' }

/media-assets/{id}/confirm:
post:
tags: [Media]
operationId: confirmUpload
summary: Confirm an upload completed successfully
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/PathId'
responses:
'200':
description: Asset confirmed; validation and OCR (if applicable) queued.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/MediaAsset' }
'404': { $ref: '#/components/responses/NotFound' }

# ============================================================

# PAYMENTS

# ============================================================

/payments:
post:
tags: [Payments]
operationId: initiateCharge
summary: Initiate a payment for a consultation
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/IdempotencyKey'
requestBody:
required: true
content:
application/json:
schema:
type: object
properties:
consultationSessionId: { type: string, format: uuid }
amount: { $ref: '#/components/schemas/Money' }
paymentMethod: { type: string, enum: [card, mobile_wallet] }
required: [consultationSessionId, amount, paymentMethod]
responses:
'201':
description: Transaction initiated.
content:
application/json:
schema:
type: object
properties:
data: { $ref: '#/components/schemas/PaymentTransaction' }
'402':
description: Payment failed.
content:
application/json:
schema: { $ref: '#/components/schemas/ErrorResponse' }

# ============================================================

# REFERENCE DATA

# ============================================================

/reference-data/specialties:
get:
tags: [Reference Data]
operationId: listSpecialties
summary: List medical specialties
responses:
'200':
description: List of specialties.
content:
application/json:
schema:
type: object
properties:
data:
type: array
items: { $ref: '#/components/schemas/ReferenceDataItem' }

# ============================================================

# AUDIT (admin only)

# ============================================================

/audit-logs:
get:
tags: [Audit]
operationId: listAuditLogs
summary: Query audit log entries (admin only; this endpoint's own access is itself audited)
security: [{ BearerAuth: [] }]
parameters: - $ref: '#/components/parameters/CursorParam' - $ref: '#/components/parameters/LimitParam' - name: entityType
in: query
schema: { type: string } - name: actorAccountId
in: query
schema: { type: string, format: uuid }
responses:
'200':
description: Paginated audit entries.
content:
application/json:
schema:
type: object
properties:
data:
type: array
items: { $ref: '#/components/schemas/AuditMetadata' }
pagination: { $ref: '#/components/schemas/Pagination' }
'403': { $ref: '#/components/responses/Forbidden' }

# ============================================================

# WEBHOOKS (Future — third-party API access, per Phase 4/10)

# ============================================================

webhooks:
paymentCompleted:
post:
tags: [Payments]
operationId: webhookPaymentCompleted
summary: PaymentCompleted event delivered to a registered subscriber
requestBody:
content:
application/json:
schema:
type: object
properties:
event: { type: string, enum: [PaymentCompleted] }
data: { $ref: '#/components/schemas/PaymentTransaction' }
responses:
'200': { description: Acknowledged. }

labResultReady:
post:
tags: [Diagnostics]
operationId: webhookLabResultReady
summary: LabResultReady event (future lab integration)
requestBody:
content:
application/json:
schema:
type: object
properties:
event: { type: string, enum: [LabResultReady] }
data:
type: object
properties:
labRequestId: { type: string, format: uuid }
resultAssetId: { type: string, format: uuid }
responses:
'200': { description: Acknowledged. }

doctorVerified:
post:
tags: [Verification]
operationId: webhookDoctorVerified
summary: DoctorVerified event
requestBody:
content:
application/json:
schema:
type: object
properties:
event: { type: string, enum: [DoctorVerified] }
data: { $ref: '#/components/schemas/VerificationCase' }
responses:
'200': { description: Acknowledged. }

knowledgePublished:
post:
tags: [Knowledge]
operationId: webhookKnowledgePublished
summary: KnowledgeArticlePublished event
requestBody:
content:
application/json:
schema:
type: object
properties:
event: { type: string, enum: [KnowledgeArticlePublished] }
data: { $ref: '#/components/schemas/KnowledgeArticle' }
responses:
'200': { description: Acknowledged. }

aiProcessingFinished:
post:
tags: [AI]
operationId: webhookAIProcessingFinished
summary: AISuggestionGenerated event, for async-generated suggestions
requestBody:
content:
application/json:
schema:
type: object
properties:
event: { type: string, enum: [AISuggestionGenerated] }
data: { $ref: '#/components/schemas/AISuggestion' }
responses:
'200': { description: Acknowledged. }
