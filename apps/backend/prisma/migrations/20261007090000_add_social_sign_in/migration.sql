-- Social Sign-In (docs/14-adrs.md ADR-008): Google/Facebook login through
-- AuthenticationModule's own OAuth flow. Additive and backward compatible:
-- every existing Credential keeps its password hash; only accounts created
-- through a provider from now on can have a NULL one.

-- AlterTable
ALTER TABLE "Credential" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ExternalIdentity" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSubject" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentity_provider_providerSubject_key" ON "ExternalIdentity"("provider", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentity_credentialId_provider_key" ON "ExternalIdentity"("credentialId", "provider");

-- CreateIndex
CREATE INDEX "ExternalIdentity_credentialId_idx" ON "ExternalIdentity"("credentialId");

-- AddForeignKey
ALTER TABLE "ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
