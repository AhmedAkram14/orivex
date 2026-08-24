/**
 * Demo Data & Profile Avatar Pass — the single canonical source of every
 * demo person's identity, avatar mapping, and role-specific seed detail.
 * The Prisma seed script (`prisma/seed.ts`) drives entirely off this file;
 * the frontend MSW mock layer (`apps/frontend/src/mocks/demo-data/`) mirrors
 * it by value (a NestJS backend and a Next.js frontend can't literally share
 * one module without a monorepo package, which is out of scope for a demo
 * pass) so the two runtime modes render identical people.
 *
 * Avatar mapping is keyed by email, not array index — reordering these
 * arrays can never accidentally reassign a photo to a different person.
 */

export type DemoGender = 'male' | 'female';

export interface DemoDoctor {
  email: string;
  displayName: string;
  gender: DemoGender;
  avatarUrl: string;
  /** The doctor's own contact number — distinct from any patient's emergency contact. */
  phoneNumber: string;
  specialtyName: string;
  professionalRank: 'resident' | 'registrar' | 'specialist' | 'consultant' | 'professor';
  yearsOfExperience: number;
  licenseNumber: string;
  licenseExpiryYearsFromNow: number;
  biography: string;
  languages: string[];
  insuranceProviders: string[];
  /** undefined => Free consultation. */
  consultationFeeAmount?: number;
  hospitalName?: string;
  publications: { title: string; reference?: string; monthsAgo: number }[];
  awards: { title: string; issuingBody?: string; monthsAgo: number }[];
  workExperience: { organizationName: string; position: string; yearsAgo: number; yearsDuration: number }[];
  /** 'approved' | 'pending' | 'rejected' — verification outcome for this doctor's application. */
  verification: 'approved' | 'pending' | 'rejected';
}

export interface DemoPatient {
  email: string;
  displayName: string;
  gender: DemoGender;
  avatarUrl: string;
  /** The patient's own contact number — distinct from their emergency contact's. */
  phoneNumber: string;
  dateOfBirthYearsAgo: number;
  bloodType?: string;
  allergies?: string;
  chronicDiseases?: string;
  hasInsurance: boolean;
  emergencyContactName: string;
  emergencyContactRelationship: 'parent' | 'spouse' | 'sibling' | 'child' | 'guardian' | 'other';
  emergencyContactPhone: string;
  /** 'approved' | 'pending' | 'suspended' — identity verification outcome. */
  verification: 'approved' | 'pending' | 'suspended';
}

export const DEMO_PASSWORD = 'Password123!';

export const DEMO_HOSPITALS = ['Cairo International Hospital', 'Nile Medical Center', 'Alexandria General Hospital'];

export const DEMO_INSURANCE_PROVIDERS = ['Misr Insurance', 'AXA Egypt', 'Allianz Egypt', 'MetLife Egypt'];

// 20 doctors — 11 Psychiatry (dominant specialty, per instruction), the
// remaining 9 spread across 8 other real, already-existing specialties.
export const DEMO_DOCTORS: DemoDoctor[] = [
  {
    email: 'doctor01@orivex.dev',
    displayName: 'Dr. Omar Hassan',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-01.png',
    phoneNumber: '+201201345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'consultant',
    yearsOfExperience: 14,
    licenseNumber: 'EG-PSY-10021',
    licenseExpiryYearsFromNow: 3,
    biography: 'Consultant psychiatrist focused on mood disorders and cognitive behavioral therapy, with over a decade treating adult outpatients in Cairo.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Misr Insurance', 'AXA Egypt'],
    consultationFeeAmount: 450,
    hospitalName: 'Cairo International Hospital',
    publications: [{ title: 'CBT Outcomes in Anxiety-Predominant Depression', reference: 'Egyptian Journal of Psychiatry', monthsAgo: 18 }],
    awards: [{ title: 'Excellence in Mental Health Care', issuingBody: 'Egyptian Psychiatric Association', monthsAgo: 30 }],
    workExperience: [{ organizationName: 'Cairo International Hospital', position: 'Consultant Psychiatrist', yearsAgo: 6, yearsDuration: 6 }],
    verification: 'approved',
  },
  {
    email: 'doctor02@orivex.dev',
    displayName: 'Dr. Salma Adel',
    gender: 'female',
    avatarUrl: '/demo/avatars/doctor-02.png',
    phoneNumber: '+201202345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'specialist',
    yearsOfExperience: 9,
    licenseNumber: 'EG-PSY-10022',
    licenseExpiryYearsFromNow: 2,
    biography: 'Specialist psychiatrist with a focus on adolescent and young-adult mental health, integrating family-centered care into treatment planning.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Misr Insurance'],
    consultationFeeAmount: 380,
    hospitalName: 'Cairo International Hospital',
    publications: [{ title: 'Family-Centered Interventions in Adolescent Anxiety', reference: 'Egyptian Journal of Psychiatry', monthsAgo: 14 }],
    awards: [{ title: 'Young Clinician Excellence Award', issuingBody: 'Egyptian Psychiatric Association', monthsAgo: 20 }],
    workExperience: [{ organizationName: 'Cairo International Hospital', position: 'Psychiatrist', yearsAgo: 4, yearsDuration: 4 }],
    verification: 'approved',
  },
  {
    email: 'doctor03@orivex.dev',
    displayName: 'Dr. Youssef Mahmoud',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-03.png',
    phoneNumber: '+201203345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'specialist',
    yearsOfExperience: 8,
    licenseNumber: 'EG-PSY-10023',
    licenseExpiryYearsFromNow: 4,
    biography: 'Treats stress, burnout, and adjustment disorders with an emphasis on practical, short-course therapy for working professionals.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['AXA Egypt', 'Allianz Egypt'],
    consultationFeeAmount: 350,
    hospitalName: 'Nile Medical Center',
    publications: [{ title: 'Short-Course CBT for Workplace Burnout', reference: 'Cairo Medical Review', monthsAgo: 10 }],
    awards: [{ title: 'Outstanding Clinical Service Award', issuingBody: 'Nile Medical Center', monthsAgo: 24 }],
    workExperience: [{ organizationName: 'Nile Medical Center', position: 'Psychiatrist', yearsAgo: 5, yearsDuration: 5 }],
    verification: 'approved',
  },
  {
    email: 'doctor04@orivex.dev',
    displayName: 'Dr. Mariam Samir',
    gender: 'female',
    avatarUrl: '/demo/avatars/doctor-04.png',
    phoneNumber: '+201204345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'registrar',
    yearsOfExperience: 5,
    licenseNumber: 'EG-PSY-10024',
    licenseExpiryYearsFromNow: 2,
    biography: 'Early-career psychiatrist building a practice around evidence-based treatment for anxiety and panic disorders.',
    languages: ['Arabic', 'English'],
    insuranceProviders: [],
    consultationFeeAmount: 250,
    hospitalName: undefined,
    publications: [{ title: 'Evidence-Based Approaches to Panic Disorder in Young Adults', reference: 'Egyptian Journal of Psychiatry', monthsAgo: 6 }],
    awards: [{ title: 'Resident Research Recognition', issuingBody: 'Nile Medical Center', monthsAgo: 18 }],
    workExperience: [{ organizationName: 'Nile Medical Center', position: 'Resident Psychiatrist', yearsAgo: 5, yearsDuration: 2 }],
    verification: 'approved',
  },
  {
    email: 'doctor05@orivex.dev',
    displayName: 'Dr. Ahmed Khaled',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-05.png',
    phoneNumber: '+201205345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'consultant',
    yearsOfExperience: 16,
    licenseNumber: 'EG-PSY-10025',
    licenseExpiryYearsFromNow: 5,
    biography: 'Consultant psychiatrist and clinical supervisor with a long-standing practice in mood and personality disorders.',
    languages: ['Arabic', 'English', 'French'],
    insuranceProviders: ['Misr Insurance', 'MetLife Egypt'],
    consultationFeeAmount: 500,
    hospitalName: 'Cairo International Hospital',
    publications: [{ title: 'Long-Term Outcomes in Bipolar Maintenance Therapy', reference: 'Cairo Medical Review', monthsAgo: 40 }],
    awards: [{ title: 'Consultant of the Year', issuingBody: 'Cairo International Hospital', monthsAgo: 15 }],
    workExperience: [{ organizationName: 'Cairo International Hospital', position: 'Consultant Psychiatrist', yearsAgo: 9, yearsDuration: 9 }],
    verification: 'approved',
  },
  {
    email: 'doctor06@orivex.dev',
    displayName: 'Dr. Dina El-Masry',
    gender: 'female',
    avatarUrl: '/demo/avatars/doctor-06.png',
    phoneNumber: '+201206345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'specialist',
    yearsOfExperience: 10,
    licenseNumber: 'EG-PSY-10026',
    licenseExpiryYearsFromNow: 3,
    biography: 'Specialist in women\'s mental health, including perinatal and postpartum mood disorders.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['AXA Egypt'],
    consultationFeeAmount: 400,
    hospitalName: 'Nile Medical Center',
    publications: [{ title: 'Postpartum Mood Disorders: A Clinical Review', reference: 'Cairo Medical Review', monthsAgo: 28 }],
    awards: [{ title: 'Women\'s Health Advocacy Award', issuingBody: 'Nile Medical Center', monthsAgo: 12 }],
    workExperience: [{ organizationName: 'Nile Medical Center', position: 'Psychiatrist', yearsAgo: 6, yearsDuration: 6 }],
    verification: 'approved',
  },
  {
    email: 'doctor07@orivex.dev',
    displayName: 'Dr. Karim Nabil',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-07.png',
    phoneNumber: '+201207345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'specialist',
    yearsOfExperience: 7,
    licenseNumber: 'EG-PSY-10027',
    licenseExpiryYearsFromNow: 2,
    biography: 'Focuses on OCD and anxiety-spectrum disorders using exposure-based and pharmacological treatment together.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Misr Insurance', 'Allianz Egypt'],
    consultationFeeAmount: 320,
    hospitalName: undefined,
    publications: [{ title: 'Combined Exposure and Pharmacological Therapy in OCD', reference: 'Egyptian Journal of Psychiatry', monthsAgo: 9 }],
    awards: [{ title: 'Excellence in Anxiety Disorder Treatment', issuingBody: 'Alexandria General Hospital', monthsAgo: 16 }],
    workExperience: [{ organizationName: 'Alexandria General Hospital', position: 'Psychiatrist', yearsAgo: 4, yearsDuration: 4 }],
    verification: 'approved',
  },
  {
    email: 'doctor08@orivex.dev',
    displayName: 'Dr. Rania Fouad',
    gender: 'female',
    avatarUrl: '/demo/avatars/doctor-08.png',
    phoneNumber: '+201208345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'professor',
    yearsOfExperience: 22,
    licenseNumber: 'EG-PSY-10028',
    licenseExpiryYearsFromNow: 6,
    biography: 'Professor of psychiatry and senior clinician with over two decades of experience across mood, psychotic, and personality disorders.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Misr Insurance', 'AXA Egypt', 'MetLife Egypt'],
    consultationFeeAmount: 600,
    hospitalName: 'Cairo International Hospital',
    publications: [
      { title: 'A Twenty-Year Retrospective on Psychotic Disorder Management in Egypt', reference: 'Egyptian Journal of Psychiatry', monthsAgo: 8 },
      { title: 'Personality Disorders in Outpatient Settings', reference: 'Cairo Medical Review', monthsAgo: 50 },
    ],
    awards: [{ title: 'Lifetime Achievement in Psychiatric Medicine', issuingBody: 'Egyptian Psychiatric Association', monthsAgo: 20 }],
    workExperience: [{ organizationName: 'Cairo International Hospital', position: 'Professor of Psychiatry', yearsAgo: 12, yearsDuration: 12 }],
    verification: 'approved',
  },
  {
    email: 'doctor09@orivex.dev',
    displayName: 'Dr. Mohamed Fathy',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-09.png',
    phoneNumber: '+201209345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'specialist',
    yearsOfExperience: 11,
    licenseNumber: 'EG-PSY-10029',
    licenseExpiryYearsFromNow: 3,
    biography: 'Works primarily with addiction recovery and dual-diagnosis patients, combining medical and behavioral treatment.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['AXA Egypt'],
    consultationFeeAmount: 380,
    hospitalName: 'Alexandria General Hospital',
    publications: [{ title: 'Dual-Diagnosis Treatment Outcomes in Alexandria', reference: 'Egyptian Journal of Psychiatry', monthsAgo: 20 }],
    awards: [{ title: 'Addiction Medicine Service Award', issuingBody: 'Alexandria General Hospital', monthsAgo: 26 }],
    workExperience: [{ organizationName: 'Alexandria General Hospital', position: 'Psychiatrist', yearsAgo: 7, yearsDuration: 7 }],
    verification: 'pending',
  },
  {
    email: 'doctor10@orivex.dev',
    displayName: 'Dr. Heba Younis',
    gender: 'female',
    avatarUrl: '/demo/avatars/doctor-10.png',
    phoneNumber: '+201210345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'registrar',
    yearsOfExperience: 4,
    licenseNumber: 'EG-PSY-10030',
    licenseExpiryYearsFromNow: 2,
    biography: 'Newly independent practice focused on stress management and sleep-related mental health concerns.',
    languages: ['Arabic', 'English'],
    insuranceProviders: [],
    consultationFeeAmount: 220,
    hospitalName: undefined,
    publications: [{ title: 'Sleep Hygiene Interventions in Stress-Related Insomnia', reference: 'Cairo Medical Review', monthsAgo: 5 }],
    awards: [{ title: 'Emerging Clinician Award', issuingBody: 'Nile Medical Center', monthsAgo: 12 }],
    workExperience: [{ organizationName: 'Nile Medical Center', position: 'Resident Psychiatrist', yearsAgo: 4, yearsDuration: 2 }],
    verification: 'approved',
  },
  {
    email: 'doctor11@orivex.dev',
    displayName: 'Dr. Tamer Gamal',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-11.png',
    phoneNumber: '+201211345678',
    specialtyName: 'Psychiatry',
    professionalRank: 'consultant',
    yearsOfExperience: 13,
    licenseNumber: 'EG-PSY-10031',
    licenseExpiryYearsFromNow: 1,
    biography: 'Consultant psychiatrist with a rejected initial application pending re-submission with updated license documentation.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Misr Insurance'],
    consultationFeeAmount: 420,
    hospitalName: 'Nile Medical Center',
    publications: [{ title: 'Long-Term Psychiatric Follow-Up in Outpatient Settings', reference: 'Egyptian Journal of Psychiatry', monthsAgo: 32 }],
    awards: [{ title: 'Consultant Excellence Recognition', issuingBody: 'Nile Medical Center', monthsAgo: 44 }],
    workExperience: [{ organizationName: 'Nile Medical Center', position: 'Psychiatrist', yearsAgo: 8, yearsDuration: 8 }],
    verification: 'rejected',
  },
  {
    email: 'doctor12@orivex.dev',
    displayName: 'Dr. Nourhan Kamal',
    gender: 'female',
    avatarUrl: '/demo/avatars/doctor-12.png',
    phoneNumber: '+201212345678',
    specialtyName: 'Cardiology',
    professionalRank: 'consultant',
    yearsOfExperience: 15,
    licenseNumber: 'EG-CAR-20011',
    licenseExpiryYearsFromNow: 4,
    biography: 'Consultant cardiologist specializing in preventive cardiology and hypertension management.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Misr Insurance', 'AXA Egypt'],
    consultationFeeAmount: 500,
    hospitalName: 'Cairo International Hospital',
    publications: [{ title: 'Hypertension Control in Urban Egyptian Adults', reference: 'Cairo Medical Review', monthsAgo: 22 }],
    awards: [{ title: 'Preventive Cardiology Leadership Award', issuingBody: 'Cairo International Hospital', monthsAgo: 18 }],
    workExperience: [{ organizationName: 'Cairo International Hospital', position: 'Consultant Cardiologist', yearsAgo: 8, yearsDuration: 8 }],
    verification: 'approved',
  },
  {
    email: 'doctor13@orivex.dev',
    displayName: 'Dr. Amr Ezzat',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-13.png',
    phoneNumber: '+201213345678',
    specialtyName: 'Cardiology',
    professionalRank: 'specialist',
    yearsOfExperience: 9,
    licenseNumber: 'EG-CAR-20012',
    licenseExpiryYearsFromNow: 3,
    biography: 'Specialist cardiologist focused on arrhythmia diagnosis and non-invasive cardiac imaging.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Allianz Egypt'],
    consultationFeeAmount: 400,
    hospitalName: 'Nile Medical Center',
    publications: [{ title: 'Non-Invasive Imaging in Arrhythmia Diagnosis', reference: 'Cairo Medical Review', monthsAgo: 14 }],
    awards: [{ title: 'Cardiology Innovation Award', issuingBody: 'Nile Medical Center', monthsAgo: 20 }],
    workExperience: [{ organizationName: 'Nile Medical Center', position: 'Cardiologist', yearsAgo: 5, yearsDuration: 5 }],
    verification: 'approved',
  },
  {
    email: 'doctor14@orivex.dev',
    displayName: 'Dr. Yasmin Talaat',
    gender: 'female',
    avatarUrl: '/demo/avatars/doctor-14.png',
    phoneNumber: '+201214345678',
    specialtyName: 'Dermatology',
    professionalRank: 'specialist',
    yearsOfExperience: 8,
    licenseNumber: 'EG-DER-20013',
    licenseExpiryYearsFromNow: 3,
    biography: 'Specialist dermatologist treating both medical and cosmetic skin conditions for adult patients.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Misr Insurance'],
    consultationFeeAmount: 350,
    hospitalName: 'Alexandria General Hospital',
    publications: [{ title: 'Managing Cosmetic and Medical Dermatology in Adults', reference: 'Cairo Medical Review', monthsAgo: 18 }],
    awards: [{ title: 'Dermatology Patient Care Award', issuingBody: 'Alexandria General Hospital', monthsAgo: 10 }],
    workExperience: [{ organizationName: 'Alexandria General Hospital', position: 'Dermatologist', yearsAgo: 5, yearsDuration: 5 }],
    verification: 'approved',
  },
  {
    email: 'doctor15@orivex.dev',
    displayName: 'Dr. Waleed Ashraf',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-15.png',
    phoneNumber: '+201215345678',
    specialtyName: 'Pediatrics',
    professionalRank: 'consultant',
    yearsOfExperience: 17,
    licenseNumber: 'EG-PED-20014',
    licenseExpiryYearsFromNow: 5,
    biography: 'Consultant pediatrician with two decades of experience in general child health and vaccination programs.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Misr Insurance', 'AXA Egypt', 'Allianz Egypt'],
    consultationFeeAmount: 300,
    hospitalName: 'Cairo International Hospital',
    publications: [{ title: 'Vaccination Uptake in Urban Pediatric Populations', reference: 'Cairo Medical Review', monthsAgo: 26 }],
    awards: [{ title: 'Community Child Health Award', issuingBody: 'Ministry of Health', monthsAgo: 36 }],
    workExperience: [{ organizationName: 'Cairo International Hospital', position: 'Consultant Pediatrician', yearsAgo: 10, yearsDuration: 10 }],
    verification: 'approved',
  },
  {
    email: 'doctor16@orivex.dev',
    displayName: 'Dr. Aya Mostafa',
    gender: 'female',
    avatarUrl: '/demo/avatars/doctor-17.png',
    phoneNumber: '+201216345678',
    specialtyName: 'Internal Medicine',
    professionalRank: 'specialist',
    yearsOfExperience: 10,
    licenseNumber: 'EG-INT-20015',
    licenseExpiryYearsFromNow: 2,
    biography: 'Specialist in internal medicine with a focus on diabetes and chronic disease management.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['AXA Egypt'],
    consultationFeeAmount: 300,
    hospitalName: 'Nile Medical Center',
    publications: [{ title: 'Chronic Disease Management in Type 2 Diabetes Patients', reference: 'Cairo Medical Review', monthsAgo: 16 }],
    awards: [{ title: 'Internal Medicine Service Excellence', issuingBody: 'Nile Medical Center', monthsAgo: 22 }],
    workExperience: [{ organizationName: 'Nile Medical Center', position: 'Internist', yearsAgo: 6, yearsDuration: 6 }],
    verification: 'approved',
  },
  {
    email: 'doctor17@orivex.dev',
    displayName: 'Dr. Mostafa Ragab',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-16.png',
    phoneNumber: '+201217345678',
    specialtyName: 'Orthopedics',
    professionalRank: 'consultant',
    yearsOfExperience: 18,
    licenseNumber: 'EG-ORT-20016',
    licenseExpiryYearsFromNow: 4,
    biography: 'Consultant orthopedic surgeon specializing in sports injuries and joint reconstruction.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Misr Insurance', 'MetLife Egypt'],
    consultationFeeAmount: 550,
    hospitalName: 'Cairo International Hospital',
    publications: [{ title: 'Joint Reconstruction Outcomes in Sports Injuries', reference: 'Cairo Medical Review', monthsAgo: 30 }],
    awards: [{ title: 'Orthopedic Surgery Excellence Award', issuingBody: 'Cairo International Hospital', monthsAgo: 40 }],
    workExperience: [{ organizationName: 'Cairo International Hospital', position: 'Consultant Orthopedic Surgeon', yearsAgo: 11, yearsDuration: 11 }],
    verification: 'approved',
  },
  {
    email: 'doctor18@orivex.dev',
    displayName: 'Dr. Sherif Gamal',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-18.png',
    phoneNumber: '+201218345678',
    specialtyName: 'Dentistry',
    professionalRank: 'specialist',
    yearsOfExperience: 7,
    licenseNumber: 'EG-DEN-20017',
    licenseExpiryYearsFromNow: 3,
    biography: 'General and cosmetic dentist providing routine and restorative dental care.',
    languages: ['Arabic', 'English'],
    insuranceProviders: [],
    consultationFeeAmount: 200,
    hospitalName: undefined,
    publications: [{ title: 'Restorative Dentistry Techniques for Adult Patients', reference: 'Cairo Medical Review', monthsAgo: 12 }],
    awards: [{ title: 'Patient Satisfaction Excellence Award', issuingBody: 'Alexandria General Hospital', monthsAgo: 8 }],
    workExperience: [{ organizationName: 'Alexandria General Hospital', position: 'Dentist', yearsAgo: 5, yearsDuration: 5 }],
    verification: 'approved',
  },
  {
    email: 'doctor19@orivex.dev',
    displayName: 'Dr. Dalia Anwar',
    gender: 'female',
    avatarUrl: '/demo/avatars/doctor-19.png',
    phoneNumber: '+201219345678',
    specialtyName: 'Otolaryngology (ENT)',
    professionalRank: 'specialist',
    yearsOfExperience: 9,
    licenseNumber: 'EG-ENT-20018',
    licenseExpiryYearsFromNow: 2,
    biography: 'ENT specialist treating sinus, hearing, and throat conditions for adults and children.',
    languages: ['Arabic', 'English'],
    insuranceProviders: ['Misr Insurance'],
    consultationFeeAmount: 320,
    hospitalName: 'Nile Medical Center',
    publications: [{ title: 'Sinus and Hearing Disorders in Adult Outpatients', reference: 'Cairo Medical Review', monthsAgo: 15 }],
    awards: [{ title: 'ENT Clinical Excellence Award', issuingBody: 'Nile Medical Center', monthsAgo: 9 }],
    workExperience: [{ organizationName: 'Nile Medical Center', position: 'ENT Specialist', yearsAgo: 6, yearsDuration: 6 }],
    verification: 'approved',
  },
  {
    email: 'doctor20@orivex.dev',
    displayName: 'Dr. Hossam Fathy',
    gender: 'male',
    avatarUrl: '/demo/avatars/doctor-20.png',
    phoneNumber: '+201220345678',
    specialtyName: 'Ophthalmology',
    professionalRank: 'registrar',
    yearsOfExperience: 5,
    licenseNumber: 'EG-OPH-20019',
    licenseExpiryYearsFromNow: 2,
    biography: 'Ophthalmologist providing routine eye exams and treatment for common vision conditions.',
    languages: ['Arabic', 'English'],
    insuranceProviders: [],
    consultationFeeAmount: 280,
    hospitalName: undefined,
    publications: [{ title: 'Common Vision Conditions in Routine Eye Exams', reference: 'Cairo Medical Review', monthsAgo: 4 }],
    awards: [{ title: 'Resident Clinical Achievement Award', issuingBody: 'Alexandria General Hospital', monthsAgo: 10 }],
    workExperience: [{ organizationName: 'Alexandria General Hospital', position: 'Resident Ophthalmologist', yearsAgo: 5, yearsDuration: 2 }],
    verification: 'approved',
  },
];

// 20 patients — realistic mix of insured/uninsured, some with real
// allergies/chronic conditions, most without (an honest majority, not a
// gap). 2 patients intentionally have zero appointment history (deliberate
// empty state, see seed script).
export const DEMO_PATIENTS: DemoPatient[] = [
  { email: 'patient01@orivex.dev', displayName: 'Ahmed Ali', gender: 'male', avatarUrl: '/demo/avatars/patient-01.png', phoneNumber: '+201101876543', dateOfBirthYearsAgo: 34, bloodType: 'O+', hasInsurance: true, emergencyContactName: 'Fatma Ali', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201001234567', verification: 'approved' },
  { email: 'patient02@orivex.dev', displayName: 'Omar Mahmoud', gender: 'male', avatarUrl: '/demo/avatars/patient-05.png', phoneNumber: '+201102876543', dateOfBirthYearsAgo: 28, bloodType: 'A+', hasInsurance: true, emergencyContactName: 'Mahmoud Saeed', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201002234567', verification: 'approved' },
  { email: 'patient03@orivex.dev', displayName: 'Youssef Hassan', gender: 'male', avatarUrl: '/demo/avatars/patient-03.png', phoneNumber: '+201103876543', dateOfBirthYearsAgo: 41, bloodType: 'B+', allergies: 'Penicillin', hasInsurance: true, emergencyContactName: 'Hassan Youssef', emergencyContactRelationship: 'sibling', emergencyContactPhone: '+201003234567', verification: 'approved' },
  { email: 'patient04@orivex.dev', displayName: 'Mariam Ahmed', gender: 'female', avatarUrl: '/demo/avatars/patient-04.png', phoneNumber: '+201104876543', dateOfBirthYearsAgo: 25, hasInsurance: false, emergencyContactName: 'Ahmed Farouk', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201004234567', verification: 'approved' },
  { email: 'patient05@orivex.dev', displayName: 'Salma Khaled', gender: 'female', avatarUrl: '/demo/avatars/patient-02.png', phoneNumber: '+201105876543', dateOfBirthYearsAgo: 31, bloodType: 'AB+', hasInsurance: true, emergencyContactName: 'Khaled Reda', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201005234567', verification: 'approved' },
  { email: 'patient06@orivex.dev', displayName: 'Layla Ibrahim', gender: 'female', avatarUrl: '/demo/avatars/patient-06.png', phoneNumber: '+201106876543', dateOfBirthYearsAgo: 47, chronicDiseases: 'Type 2 diabetes', hasInsurance: true, emergencyContactName: 'Ibrahim Nabil', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201006234567', verification: 'approved' },
  { email: 'patient07@orivex.dev', displayName: 'Nour Sami', gender: 'female', avatarUrl: '/demo/avatars/patient-08.png', phoneNumber: '+201107876543', dateOfBirthYearsAgo: 22, hasInsurance: false, emergencyContactName: 'Sami Adel', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201007234567', verification: 'approved' },
  { email: 'patient08@orivex.dev', displayName: 'Hassan Tawfik', gender: 'male', avatarUrl: '/demo/avatars/patient-07.png', phoneNumber: '+201108876543', dateOfBirthYearsAgo: 55, bloodType: 'O-', chronicDiseases: 'Hypertension', hasInsurance: true, emergencyContactName: 'Tawfik Hassan Jr.', emergencyContactRelationship: 'child', emergencyContactPhone: '+201008234567', verification: 'approved' },
  { email: 'patient09@orivex.dev', displayName: 'Mona Farouk', gender: 'female', avatarUrl: '/demo/avatars/patient-10.png', phoneNumber: '+201109876543', dateOfBirthYearsAgo: 38, bloodType: 'A-', hasInsurance: true, emergencyContactName: 'Farouk Samy', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201009234567', verification: 'approved' },
  { email: 'patient10@orivex.dev', displayName: 'Karim Mostafa', gender: 'male', avatarUrl: '/demo/avatars/patient-09.png', phoneNumber: '+201110876543', dateOfBirthYearsAgo: 29, hasInsurance: false, emergencyContactName: 'Mostafa Karim Sr.', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201010234567', verification: 'approved' },
  { email: 'patient11@orivex.dev', displayName: 'Amir Zaki', gender: 'male', avatarUrl: '/demo/avatars/patient-11.png', phoneNumber: '+201111876543', dateOfBirthYearsAgo: 33, allergies: 'Shellfish, pollen', hasInsurance: true, emergencyContactName: 'Zaki Mounir', emergencyContactRelationship: 'sibling', emergencyContactPhone: '+201011234567', verification: 'approved' },
  { email: 'patient12@orivex.dev', displayName: 'Dina Adel', gender: 'female', avatarUrl: '/demo/avatars/patient-12.png', phoneNumber: '+201112876543', dateOfBirthYearsAgo: 26, hasInsurance: true, emergencyContactName: 'Adel Fathallah', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201012234567', verification: 'pending' },
  { email: 'patient13@orivex.dev', displayName: 'Ziad Youssef', gender: 'male', avatarUrl: '/demo/avatars/patient-13.png', phoneNumber: '+201113876543', dateOfBirthYearsAgo: 30, bloodType: 'B-', hasInsurance: true, emergencyContactName: 'Youssef Kamal', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201013234567', verification: 'approved' },
  { email: 'patient14@orivex.dev', displayName: 'Rana Sobhy', gender: 'female', avatarUrl: '/demo/avatars/patient-14.png', phoneNumber: '+201114876543', dateOfBirthYearsAgo: 24, hasInsurance: false, emergencyContactName: 'Sobhy Ahmed', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201014234567', verification: 'pending' },
  { email: 'patient15@orivex.dev', displayName: 'Tarek Aziz', gender: 'male', avatarUrl: '/demo/avatars/patient-15.png', phoneNumber: '+201115876543', dateOfBirthYearsAgo: 44, bloodType: 'O+', chronicDiseases: 'Asthma', hasInsurance: true, emergencyContactName: 'Aziz Younis', emergencyContactRelationship: 'sibling', emergencyContactPhone: '+201015234567', verification: 'approved' },
  { email: 'patient16@orivex.dev', displayName: 'Nadia Fawzy', gender: 'female', avatarUrl: '/demo/avatars/patient-16.png', phoneNumber: '+201116876543', dateOfBirthYearsAgo: 36, hasInsurance: true, emergencyContactName: 'Fawzy Ramzy', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201016234567', verification: 'approved' },
  { email: 'patient17@orivex.dev', displayName: 'Fady Nassar', gender: 'male', avatarUrl: '/demo/avatars/patient-17.png', phoneNumber: '+201117876543', dateOfBirthYearsAgo: 27, hasInsurance: false, emergencyContactName: 'Nassar Iskandar', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201017234567', verification: 'suspended' },
  { email: 'patient18@orivex.dev', displayName: 'Ghada Selim', gender: 'female', avatarUrl: '/demo/avatars/patient-18.png', phoneNumber: '+201118876543', dateOfBirthYearsAgo: 39, bloodType: 'AB-', hasInsurance: true, emergencyContactName: 'Selim Ashraf', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201018234567', verification: 'approved' },
  // Deliberately new/minimal patients — never booked an appointment yet, a
  // genuine, common real state, not something to paper over.
  { email: 'patient19@orivex.dev', displayName: 'Bassem Naguib', gender: 'male', avatarUrl: '/demo/avatars/patient-19.png', phoneNumber: '+201119876543', dateOfBirthYearsAgo: 23, hasInsurance: false, emergencyContactName: 'Naguib Boulos', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201019234567', verification: 'approved' },
  { email: 'patient20@orivex.dev', displayName: 'Iman Rashad', gender: 'female', avatarUrl: '/demo/avatars/patient-20.png', phoneNumber: '+201120876543', dateOfBirthYearsAgo: 21, hasInsurance: false, emergencyContactName: 'Rashad Hany', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201020234567', verification: 'approved' },
];

export const DEMO_SUPER_ADMIN = {
  email: 'admin@orivex.dev',
  displayName: 'Layla Mansour',
  phoneNumber: '+201220000001',
};

export const DEMO_HOSPITAL_ADMIN = {
  email: 'hospitaladmin@orivex.dev',
  displayName: 'Sameh Barakat',
  phoneNumber: '+201220000002',
};

/** Patients who never book anything — a genuine empty state (§8 of the plan), not every record maximally full. */
export const DEMO_PATIENTS_WITH_NO_APPOINTMENTS = new Set(['patient19@orivex.dev', 'patient20@orivex.dev']);

/** Doctors who never accumulate a cancellation — a genuine empty state. */
export const DEMO_DOCTORS_WITH_NO_CANCELLATIONS = new Set(['doctor02@orivex.dev', 'doctor14@orivex.dev']);
