-- Sprint 15: AuthenticationModule (docs/10-backend-architecture.md's new
-- AuthenticationModule entry; docs/14-adrs.md's "First-Party Authentication
-- Instead of Keycloak" ADR). The project has decided against integrating
-- Keycloak — Account.keycloakId and the Keycloak-shaped Session model (a
-- mirror of Keycloak-issued sessions) are removed entirely, not merely
-- deprecated. No account row can have a genuine external credential tied to
-- it today (no auth routes existed until this sprint), so this is a safe,
-- deliberate breaking change, not an oversight.
--
-- Credential/Session/AuthToken are AuthenticationModule's own aggregate
-- roots: Identity keeps owning Account/Profile/Roles, Authentication owns
-- credentials/tokens/sessions, linked to an Account by id only.

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_accountId_fkey";

-- DropTable
DROP TABLE "Session";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "keycloakId";

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Credential_accountId_key" ON "Credential"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_credentialId_idx" ON "Session"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_credentialId_purpose_idx" ON "AuthToken"("credentialId", "purpose");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
