import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// MSW Demo Clinical Documents fix -- proves the real seeded demo dataset
// (not a hand-crafted fixture) populates clinical documents for a realistic
// number of patients, every document uses only a real clinical purpose, and
// documents never leak across patients. Mirrors
// demo-account-consistency.test.ts's own pattern: `DEMO_SEED_ENABLED` is
// mocked true just for this file so the real `seedDemoData()` runs, without
// disturbing the rest of the suite's small deterministic fixtures.
vi.mock('@/mocks/demo-mode', () => ({ DEMO_SEED_ENABLED: true }));

describe('Demo clinical documents (MSW Demo Clinical Documents fix)', () => {
  it('seeds real-looking clinical documents for at least 8 demo patients, each resolvable by their own canonical account id', async () => {
    const { seedDemoData } = await import('@/mocks/demo-data/demo-seeder');
    const { getDocumentsForAccount } = await import('@/mocks/media-asset-store');
    const { DEMO_PATIENTS } = await import('@/mocks/demo-data/demo-people');

    seedDemoData();

    const patientsWithDocuments = DEMO_PATIENTS.filter((patient) => getDocumentsForAccount(patient.accountId).length > 0);
    expect(patientsWithDocuments.length).toBeGreaterThanOrEqual(8);

    for (const patient of patientsWithDocuments) {
      const documents = getDocumentsForAccount(patient.accountId);
      for (const document of documents) {
        // Every document belongs to exactly the account it was fetched for.
        expect(document.ownerAccountId).toBe(patient.accountId);
        // Only the two real clinical purposes -- never an invented one, and
        // never an identity-verification purpose.
        expect(['clinical_attachment', 'lab_report']).toContain(document.purpose);
        // A real, resolvable id/date/url -- never fabricated placeholders.
        expect(document.id).toMatch(/^document-demo-/);
        expect(new Date(document.createdAt).toString()).not.toBe('Invalid Date');
        expect(document.signedUrl).toBeTruthy();
      }
    }
  });

  it("never returns one patient's documents when looking up a different patient (cross-patient isolation)", async () => {
    const { seedDemoData } = await import('@/mocks/demo-data/demo-seeder');
    const { getDocumentsForAccount } = await import('@/mocks/media-asset-store');
    const { DEMO_PATIENTS } = await import('@/mocks/demo-data/demo-people');

    seedDemoData();

    const withDocuments = DEMO_PATIENTS.filter((patient) => getDocumentsForAccount(patient.accountId).length > 0);
    expect(withDocuments.length).toBeGreaterThanOrEqual(2);

    const [patientA, patientB] = withDocuments;
    const docsA = getDocumentsForAccount(patientA.accountId).map((document) => document.id);
    const docsB = getDocumentsForAccount(patientB.accountId).map((document) => document.id);

    for (const id of docsA) {
      expect(docsB).not.toContain(id);
    }
  });

  it('resolves the same canonical patient id end-to-end: Patients list -> patient profile id -> account id -> that patient\'s own documents', async () => {
    const { seedDemoData } = await import('@/mocks/demo-data/demo-seeder');
    const { getPatients } = await import('@/mocks/doctor-store');
    const { getAccountIdForPatientProfileId } = await import('@/mocks/patient-store');
    const { getDocumentsForAccount } = await import('@/mocks/media-asset-store');
    const { DEMO_DOCTORS } = await import('@/mocks/demo-data/demo-people');

    seedDemoData();

    let checkedAtLeastOne = false;
    for (const doctor of DEMO_DOCTORS) {
      for (const item of getPatients(doctor.accountId)) {
        const accountId = getAccountIdForPatientProfileId(item.patientProfileId);
        const documents = getDocumentsForAccount(accountId);
        if (documents.length > 0) {
          checkedAtLeastOne = true;
          expect(documents.every((document) => document.ownerAccountId === accountId)).toBe(true);
        }
      }
    }
    expect(checkedAtLeastOne).toBe(true);
  });

  it('Demo Document Binary fix: every seeded signedUrl resolves to a real, non-empty file of the expected type under public/demo/documents', async () => {
    const { seedDemoData } = await import('@/mocks/demo-data/demo-seeder');
    const { getDocumentsForAccount } = await import('@/mocks/media-asset-store');
    const { DEMO_PATIENTS } = await import('@/mocks/demo-data/demo-people');

    seedDemoData();

    const extensionByContentType: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
    };

    let checkedFiles = 0;
    for (const patient of DEMO_PATIENTS) {
      for (const document of getDocumentsForAccount(patient.accountId)) {
        expect(document.signedUrl.startsWith('/demo/documents/')).toBe(true);
        // Never a random external host or S3-style URL in demo mode.
        expect(document.signedUrl).not.toMatch(/^https?:\/\//);

        const relativePath = document.signedUrl.replace(/^\//, '');
        const absolutePath = path.join(process.cwd(), 'public', relativePath);
        expect(existsSync(absolutePath), `expected a real file at ${absolutePath}`).toBe(true);

        const stats = statSync(absolutePath);
        expect(stats.size).toBeGreaterThan(0);

        const expectedExtension = extensionByContentType[document.contentType];
        expect(expectedExtension).toBeDefined();
        expect(absolutePath.endsWith(expectedExtension!)).toBe(true);

        checkedFiles += 1;
      }
    }
    expect(checkedFiles).toBeGreaterThanOrEqual(14);
  });

  it('Demo Document Binary fix: no orphan files -- every real file under public/demo/documents is referenced by exactly one seeded document', async () => {
    const { seedDemoData } = await import('@/mocks/demo-data/demo-seeder');
    const { getDocumentsForAccount } = await import('@/mocks/media-asset-store');
    const { DEMO_PATIENTS } = await import('@/mocks/demo-data/demo-people');

    seedDemoData();

    const referencedFilenames = new Set(
      DEMO_PATIENTS.flatMap((patient) =>
        getDocumentsForAccount(patient.accountId).map((document) => document.signedUrl.split('/').pop()),
      ),
    );

    const documentsDir = path.join(process.cwd(), 'public', 'demo', 'documents');
    const filesOnDisk = readdirSync(documentsDir);

    for (const filename of filesOnDisk) {
      expect(referencedFilenames.has(filename), `${filename} exists on disk but no seeded document references it`).toBe(true);
    }
    expect(filesOnDisk.length).toBe(referencedFilenames.size);
  });
});
