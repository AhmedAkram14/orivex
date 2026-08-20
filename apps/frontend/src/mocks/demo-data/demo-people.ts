/**
 * Demo Data & Profile Avatar Pass — the MSW-side mirror of
 * `apps/backend/prisma/demo-data/demo-people.ts`. Values here are
 * transcribed 1:1 from that file (same emails, names, avatar paths,
 * specialties) so the frontend MSW demo mode and a real-backend + Prisma
 * seed render identical people. A NestJS backend and a Next.js frontend
 * can't literally share one module without a monorepo package (out of
 * scope for a demo pass), so this is a deliberate, documented duplication
 * of values, not of architecture.
 *
 * `accountId` here is what `auth-store.ts` uses as the mock account id and
 * what gets embedded in the mock bearer token
 * (`mock-access-token.${accountId}.${timestamp}`) — every other mock store
 * keys its per-account data off this same id.
 */

export type DemoGender = 'male' | 'female';

export interface DemoDoctor {
  accountId: string;
  email: string;
  displayName: string;
  gender: DemoGender;
  avatarUrl: string;
  specialtyName: string;
  professionalRank: 'resident' | 'registrar' | 'specialist' | 'consultant' | 'professor';
  yearsOfExperience: number;
  biography: string;
  languages: string[];
  insuranceProviders: string[];
  consultationFeeAmount?: number;
  hospitalName?: string;
  verification: 'approved' | 'pending' | 'rejected';
}

export interface DemoPatient {
  accountId: string;
  email: string;
  displayName: string;
  gender: DemoGender;
  avatarUrl: string;
  dateOfBirthYearsAgo: number;
  bloodType?: string;
  allergies?: string;
  chronicDiseases?: string;
  hasInsurance: boolean;
  emergencyContactName: string;
  emergencyContactRelationship: 'parent' | 'spouse' | 'sibling' | 'child' | 'guardian' | 'other';
  emergencyContactPhone: string;
  verification: 'approved' | 'pending' | 'suspended';
}

export const DEMO_PASSWORD = 'Password123!';

export const DEMO_HOSPITALS = ['Cairo International Hospital', 'Nile Medical Center', 'Alexandria General Hospital'];

// 20 doctors — 11 Psychiatry (dominant specialty), remaining 9 spread
// across 8 other specialties. Mirrors the backend file's DEMO_DOCTORS
// exactly (name/email/avatar/specialty/gender); a few backend-only fields
// (license number, publications/awards/work history) aren't needed here
// since the MSW layer's DoctorProfile type doesn't carry them.
export const DEMO_DOCTORS: DemoDoctor[] = [
  { accountId: 'user-doctor-1', email: 'doctor01@orivex.dev', displayName: 'Dr. Omar Hassan', gender: 'male', avatarUrl: '/demo/avatars/doctor-01.png', specialtyName: 'Psychiatry', professionalRank: 'consultant', yearsOfExperience: 14, biography: 'Consultant psychiatrist focused on mood disorders and cognitive behavioral therapy, with over a decade treating adult outpatients in Cairo.', languages: ['Arabic', 'English'], insuranceProviders: ['Misr Insurance', 'AXA Egypt'], consultationFeeAmount: 450, hospitalName: 'Cairo International Hospital', verification: 'approved' },
  { accountId: 'user-doctor-2', email: 'doctor02@orivex.dev', displayName: 'Dr. Salma Adel', gender: 'female', avatarUrl: '/demo/avatars/doctor-02.png', specialtyName: 'Psychiatry', professionalRank: 'specialist', yearsOfExperience: 9, biography: 'Specialist psychiatrist with a focus on adolescent and young-adult mental health, integrating family-centered care into treatment planning.', languages: ['Arabic', 'English'], insuranceProviders: ['Misr Insurance'], consultationFeeAmount: 380, hospitalName: 'Cairo International Hospital', verification: 'approved' },
  { accountId: 'user-doctor-3', email: 'doctor03@orivex.dev', displayName: 'Dr. Youssef Mahmoud', gender: 'male', avatarUrl: '/demo/avatars/doctor-03.png', specialtyName: 'Psychiatry', professionalRank: 'specialist', yearsOfExperience: 8, biography: 'Treats stress, burnout, and adjustment disorders with an emphasis on practical, short-course therapy for working professionals.', languages: ['Arabic', 'English'], insuranceProviders: ['AXA Egypt', 'Allianz Egypt'], consultationFeeAmount: 350, hospitalName: 'Nile Medical Center', verification: 'approved' },
  { accountId: 'user-doctor-4', email: 'doctor04@orivex.dev', displayName: 'Dr. Mariam Samir', gender: 'female', avatarUrl: '/demo/avatars/doctor-04.png', specialtyName: 'Psychiatry', professionalRank: 'registrar', yearsOfExperience: 5, biography: 'Early-career psychiatrist building a practice around evidence-based treatment for anxiety and panic disorders.', languages: ['Arabic', 'English'], insuranceProviders: [], consultationFeeAmount: 250, hospitalName: undefined, verification: 'approved' },
  { accountId: 'user-doctor-5', email: 'doctor05@orivex.dev', displayName: 'Dr. Ahmed Khaled', gender: 'male', avatarUrl: '/demo/avatars/doctor-05.png', specialtyName: 'Psychiatry', professionalRank: 'consultant', yearsOfExperience: 16, biography: 'Consultant psychiatrist and clinical supervisor with a long-standing practice in mood and personality disorders.', languages: ['Arabic', 'English', 'French'], insuranceProviders: ['Misr Insurance', 'MetLife Egypt'], consultationFeeAmount: 500, hospitalName: 'Cairo International Hospital', verification: 'approved' },
  { accountId: 'user-doctor-6', email: 'doctor06@orivex.dev', displayName: 'Dr. Dina El-Masry', gender: 'female', avatarUrl: '/demo/avatars/doctor-06.png', specialtyName: 'Psychiatry', professionalRank: 'specialist', yearsOfExperience: 10, biography: "Specialist in women's mental health, including perinatal and postpartum mood disorders.", languages: ['Arabic', 'English'], insuranceProviders: ['AXA Egypt'], consultationFeeAmount: 400, hospitalName: 'Nile Medical Center', verification: 'approved' },
  { accountId: 'user-doctor-7', email: 'doctor07@orivex.dev', displayName: 'Dr. Karim Nabil', gender: 'male', avatarUrl: '/demo/avatars/doctor-07.png', specialtyName: 'Psychiatry', professionalRank: 'specialist', yearsOfExperience: 7, biography: 'Focuses on OCD and anxiety-spectrum disorders using exposure-based and pharmacological treatment together.', languages: ['Arabic', 'English'], insuranceProviders: ['Misr Insurance', 'Allianz Egypt'], consultationFeeAmount: 320, hospitalName: undefined, verification: 'approved' },
  { accountId: 'user-doctor-8', email: 'doctor08@orivex.dev', displayName: 'Dr. Rania Fouad', gender: 'female', avatarUrl: '/demo/avatars/doctor-08.png', specialtyName: 'Psychiatry', professionalRank: 'professor', yearsOfExperience: 22, biography: 'Professor of psychiatry and senior clinician with over two decades of experience across mood, psychotic, and personality disorders.', languages: ['Arabic', 'English'], insuranceProviders: ['Misr Insurance', 'AXA Egypt', 'MetLife Egypt'], consultationFeeAmount: 600, hospitalName: 'Cairo International Hospital', verification: 'approved' },
  { accountId: 'user-doctor-9', email: 'doctor09@orivex.dev', displayName: 'Dr. Mohamed Fathy', gender: 'male', avatarUrl: '/demo/avatars/doctor-09.png', specialtyName: 'Psychiatry', professionalRank: 'specialist', yearsOfExperience: 11, biography: 'Works primarily with addiction recovery and dual-diagnosis patients, combining medical and behavioral treatment.', languages: ['Arabic', 'English'], insuranceProviders: ['AXA Egypt'], consultationFeeAmount: 380, hospitalName: 'Alexandria General Hospital', verification: 'pending' },
  { accountId: 'user-doctor-10', email: 'doctor10@orivex.dev', displayName: 'Dr. Heba Younis', gender: 'female', avatarUrl: '/demo/avatars/doctor-10.png', specialtyName: 'Psychiatry', professionalRank: 'registrar', yearsOfExperience: 4, biography: 'Newly independent practice focused on stress management and sleep-related mental health concerns.', languages: ['Arabic', 'English'], insuranceProviders: [], consultationFeeAmount: 220, hospitalName: undefined, verification: 'approved' },
  { accountId: 'user-doctor-11', email: 'doctor11@orivex.dev', displayName: 'Dr. Tamer Gamal', gender: 'male', avatarUrl: '/demo/avatars/doctor-11.png', specialtyName: 'Psychiatry', professionalRank: 'consultant', yearsOfExperience: 13, biography: 'Consultant psychiatrist with a rejected initial application pending re-submission with updated license documentation.', languages: ['Arabic', 'English'], insuranceProviders: ['Misr Insurance'], consultationFeeAmount: 420, hospitalName: 'Nile Medical Center', verification: 'rejected' },
  { accountId: 'user-doctor-12', email: 'doctor12@orivex.dev', displayName: 'Dr. Nourhan Kamal', gender: 'female', avatarUrl: '/demo/avatars/doctor-12.png', specialtyName: 'Cardiology', professionalRank: 'consultant', yearsOfExperience: 15, biography: 'Consultant cardiologist specializing in preventive cardiology and hypertension management.', languages: ['Arabic', 'English'], insuranceProviders: ['Misr Insurance', 'AXA Egypt'], consultationFeeAmount: 500, hospitalName: 'Cairo International Hospital', verification: 'approved' },
  { accountId: 'user-doctor-13', email: 'doctor13@orivex.dev', displayName: 'Dr. Amr Ezzat', gender: 'male', avatarUrl: '/demo/avatars/doctor-13.png', specialtyName: 'Cardiology', professionalRank: 'specialist', yearsOfExperience: 9, biography: 'Specialist cardiologist focused on arrhythmia diagnosis and non-invasive cardiac imaging.', languages: ['Arabic', 'English'], insuranceProviders: ['Allianz Egypt'], consultationFeeAmount: 400, hospitalName: 'Nile Medical Center', verification: 'approved' },
  { accountId: 'user-doctor-14', email: 'doctor14@orivex.dev', displayName: 'Dr. Yasmin Talaat', gender: 'female', avatarUrl: '/demo/avatars/doctor-14.png', specialtyName: 'Dermatology', professionalRank: 'specialist', yearsOfExperience: 8, biography: 'Specialist dermatologist treating both medical and cosmetic skin conditions for adult patients.', languages: ['Arabic', 'English'], insuranceProviders: ['Misr Insurance'], consultationFeeAmount: 350, hospitalName: 'Alexandria General Hospital', verification: 'approved' },
  { accountId: 'user-doctor-15', email: 'doctor15@orivex.dev', displayName: 'Dr. Waleed Ashraf', gender: 'male', avatarUrl: '/demo/avatars/doctor-15.png', specialtyName: 'Pediatrics', professionalRank: 'consultant', yearsOfExperience: 17, biography: 'Consultant pediatrician with two decades of experience in general child health and vaccination programs.', languages: ['Arabic', 'English'], insuranceProviders: ['Misr Insurance', 'AXA Egypt', 'Allianz Egypt'], consultationFeeAmount: 300, hospitalName: 'Cairo International Hospital', verification: 'approved' },
  { accountId: 'user-doctor-16', email: 'doctor16@orivex.dev', displayName: 'Dr. Aya Mostafa', gender: 'female', avatarUrl: '/demo/avatars/doctor-17.png', specialtyName: 'Internal Medicine', professionalRank: 'specialist', yearsOfExperience: 10, biography: 'Specialist in internal medicine with a focus on diabetes and chronic disease management.', languages: ['Arabic', 'English'], insuranceProviders: ['AXA Egypt'], consultationFeeAmount: 300, hospitalName: 'Nile Medical Center', verification: 'approved' },
  { accountId: 'user-doctor-17', email: 'doctor17@orivex.dev', displayName: 'Dr. Mostafa Ragab', gender: 'male', avatarUrl: '/demo/avatars/doctor-16.png', specialtyName: 'Orthopedics', professionalRank: 'consultant', yearsOfExperience: 18, biography: 'Consultant orthopedic surgeon specializing in sports injuries and joint reconstruction.', languages: ['Arabic', 'English'], insuranceProviders: ['Misr Insurance', 'MetLife Egypt'], consultationFeeAmount: 550, hospitalName: 'Cairo International Hospital', verification: 'approved' },
  { accountId: 'user-doctor-18', email: 'doctor18@orivex.dev', displayName: 'Dr. Sherif Gamal', gender: 'male', avatarUrl: '/demo/avatars/doctor-18.png', specialtyName: 'Dentistry', professionalRank: 'specialist', yearsOfExperience: 7, biography: 'General and cosmetic dentist providing routine and restorative dental care.', languages: ['Arabic', 'English'], insuranceProviders: [], consultationFeeAmount: 200, hospitalName: undefined, verification: 'approved' },
  { accountId: 'user-doctor-19', email: 'doctor19@orivex.dev', displayName: 'Dr. Dalia Anwar', gender: 'female', avatarUrl: '/demo/avatars/doctor-19.png', specialtyName: 'Otolaryngology (ENT)', professionalRank: 'specialist', yearsOfExperience: 9, biography: 'ENT specialist treating sinus, hearing, and throat conditions for adults and children.', languages: ['Arabic', 'English'], insuranceProviders: ['Misr Insurance'], consultationFeeAmount: 320, hospitalName: 'Nile Medical Center', verification: 'approved' },
  { accountId: 'user-doctor-20', email: 'doctor20@orivex.dev', displayName: 'Dr. Hossam Fathy', gender: 'male', avatarUrl: '/demo/avatars/doctor-20.png', specialtyName: 'Ophthalmology', professionalRank: 'registrar', yearsOfExperience: 5, biography: 'Ophthalmologist providing routine eye exams and treatment for common vision conditions.', languages: ['Arabic', 'English'], insuranceProviders: [], consultationFeeAmount: 280, hospitalName: undefined, verification: 'approved' },
];

export const DEMO_PATIENTS: DemoPatient[] = [
  { accountId: 'user-patient-1', email: 'patient01@orivex.dev', displayName: 'Ahmed Ali', gender: 'male', avatarUrl: '/demo/avatars/patient-01.png', dateOfBirthYearsAgo: 34, bloodType: 'O+', hasInsurance: true, emergencyContactName: 'Fatma Ali', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201001234567', verification: 'approved' },
  { accountId: 'user-patient-2', email: 'patient02@orivex.dev', displayName: 'Omar Mahmoud', gender: 'male', avatarUrl: '/demo/avatars/patient-05.png', dateOfBirthYearsAgo: 28, bloodType: 'A+', hasInsurance: true, emergencyContactName: 'Mahmoud Saeed', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201002234567', verification: 'approved' },
  { accountId: 'user-patient-3', email: 'patient03@orivex.dev', displayName: 'Youssef Hassan', gender: 'male', avatarUrl: '/demo/avatars/patient-03.png', dateOfBirthYearsAgo: 41, bloodType: 'B+', allergies: 'Penicillin', hasInsurance: true, emergencyContactName: 'Hassan Youssef', emergencyContactRelationship: 'sibling', emergencyContactPhone: '+201003234567', verification: 'approved' },
  { accountId: 'user-patient-4', email: 'patient04@orivex.dev', displayName: 'Mariam Ahmed', gender: 'female', avatarUrl: '/demo/avatars/patient-04.png', dateOfBirthYearsAgo: 25, hasInsurance: false, emergencyContactName: 'Ahmed Farouk', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201004234567', verification: 'approved' },
  { accountId: 'user-patient-5', email: 'patient05@orivex.dev', displayName: 'Salma Khaled', gender: 'female', avatarUrl: '/demo/avatars/patient-02.png', dateOfBirthYearsAgo: 31, bloodType: 'AB+', hasInsurance: true, emergencyContactName: 'Khaled Reda', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201005234567', verification: 'approved' },
  { accountId: 'user-patient-6', email: 'patient06@orivex.dev', displayName: 'Layla Ibrahim', gender: 'female', avatarUrl: '/demo/avatars/patient-06.png', dateOfBirthYearsAgo: 47, chronicDiseases: 'Type 2 diabetes', hasInsurance: true, emergencyContactName: 'Ibrahim Nabil', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201006234567', verification: 'approved' },
  { accountId: 'user-patient-7', email: 'patient07@orivex.dev', displayName: 'Nour Sami', gender: 'female', avatarUrl: '/demo/avatars/patient-08.png', dateOfBirthYearsAgo: 22, hasInsurance: false, emergencyContactName: 'Sami Adel', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201007234567', verification: 'approved' },
  { accountId: 'user-patient-8', email: 'patient08@orivex.dev', displayName: 'Hassan Tawfik', gender: 'male', avatarUrl: '/demo/avatars/patient-07.png', dateOfBirthYearsAgo: 55, bloodType: 'O-', chronicDiseases: 'Hypertension', hasInsurance: true, emergencyContactName: 'Tawfik Hassan Jr.', emergencyContactRelationship: 'child', emergencyContactPhone: '+201008234567', verification: 'approved' },
  { accountId: 'user-patient-9', email: 'patient09@orivex.dev', displayName: 'Mona Farouk', gender: 'female', avatarUrl: '/demo/avatars/patient-10.png', dateOfBirthYearsAgo: 38, bloodType: 'A-', hasInsurance: true, emergencyContactName: 'Farouk Samy', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201009234567', verification: 'approved' },
  { accountId: 'user-patient-10', email: 'patient10@orivex.dev', displayName: 'Karim Mostafa', gender: 'male', avatarUrl: '/demo/avatars/patient-09.png', dateOfBirthYearsAgo: 29, hasInsurance: false, emergencyContactName: 'Mostafa Karim Sr.', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201010234567', verification: 'approved' },
  { accountId: 'user-patient-11', email: 'patient11@orivex.dev', displayName: 'Amir Zaki', gender: 'male', avatarUrl: '/demo/avatars/patient-11.png', dateOfBirthYearsAgo: 33, allergies: 'Shellfish, pollen', hasInsurance: true, emergencyContactName: 'Zaki Mounir', emergencyContactRelationship: 'sibling', emergencyContactPhone: '+201011234567', verification: 'approved' },
  { accountId: 'user-patient-12', email: 'patient12@orivex.dev', displayName: 'Dina Adel', gender: 'female', avatarUrl: '/demo/avatars/patient-12.png', dateOfBirthYearsAgo: 26, hasInsurance: true, emergencyContactName: 'Adel Fathallah', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201012234567', verification: 'pending' },
  { accountId: 'user-patient-13', email: 'patient13@orivex.dev', displayName: 'Ziad Youssef', gender: 'male', avatarUrl: '/demo/avatars/patient-13.png', dateOfBirthYearsAgo: 30, bloodType: 'B-', hasInsurance: true, emergencyContactName: 'Youssef Kamal', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201013234567', verification: 'approved' },
  { accountId: 'user-patient-14', email: 'patient14@orivex.dev', displayName: 'Rana Sobhy', gender: 'female', avatarUrl: '/demo/avatars/patient-14.png', dateOfBirthYearsAgo: 24, hasInsurance: false, emergencyContactName: 'Sobhy Ahmed', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201014234567', verification: 'pending' },
  { accountId: 'user-patient-15', email: 'patient15@orivex.dev', displayName: 'Tarek Aziz', gender: 'male', avatarUrl: '/demo/avatars/patient-15.png', dateOfBirthYearsAgo: 44, bloodType: 'O+', chronicDiseases: 'Asthma', hasInsurance: true, emergencyContactName: 'Aziz Younis', emergencyContactRelationship: 'sibling', emergencyContactPhone: '+201015234567', verification: 'approved' },
  { accountId: 'user-patient-16', email: 'patient16@orivex.dev', displayName: 'Nadia Fawzy', gender: 'female', avatarUrl: '/demo/avatars/patient-16.png', dateOfBirthYearsAgo: 36, hasInsurance: true, emergencyContactName: 'Fawzy Ramzy', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201016234567', verification: 'approved' },
  { accountId: 'user-patient-17', email: 'patient17@orivex.dev', displayName: 'Fady Nassar', gender: 'male', avatarUrl: '/demo/avatars/patient-17.png', dateOfBirthYearsAgo: 27, hasInsurance: false, emergencyContactName: 'Nassar Iskandar', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201017234567', verification: 'suspended' },
  { accountId: 'user-patient-18', email: 'patient18@orivex.dev', displayName: 'Ghada Selim', gender: 'female', avatarUrl: '/demo/avatars/patient-18.png', dateOfBirthYearsAgo: 39, bloodType: 'AB-', hasInsurance: true, emergencyContactName: 'Selim Ashraf', emergencyContactRelationship: 'spouse', emergencyContactPhone: '+201018234567', verification: 'approved' },
  { accountId: 'user-patient-19', email: 'patient19@orivex.dev', displayName: 'Bassem Naguib', gender: 'male', avatarUrl: '/demo/avatars/patient-19.png', dateOfBirthYearsAgo: 23, hasInsurance: false, emergencyContactName: 'Naguib Boulos', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201019234567', verification: 'approved' },
  { accountId: 'user-patient-20', email: 'patient20@orivex.dev', displayName: 'Iman Rashad', gender: 'female', avatarUrl: '/demo/avatars/patient-20.png', dateOfBirthYearsAgo: 21, hasInsurance: false, emergencyContactName: 'Rashad Hany', emergencyContactRelationship: 'parent', emergencyContactPhone: '+201020234567', verification: 'approved' },
];

export const DEMO_SUPER_ADMIN = { accountId: 'user-admin-1', email: 'admin@orivex.dev', displayName: 'Layla Mansour' };
export const DEMO_HOSPITAL_ADMIN = { accountId: 'user-hospitaladmin-1', email: 'hospitaladmin@orivex.dev', displayName: 'Sameh Barakat' };

/** Patients who never book anything — a genuine empty state, not every record maximally full. */
export const DEMO_PATIENTS_WITH_NO_APPOINTMENTS = new Set(['patient19@orivex.dev', 'patient20@orivex.dev']);

/** Doctors who never accumulate a cancellation — a genuine empty state. */
export const DEMO_DOCTORS_WITH_NO_CANCELLATIONS = new Set(['doctor02@orivex.dev', 'doctor14@orivex.dev']);
