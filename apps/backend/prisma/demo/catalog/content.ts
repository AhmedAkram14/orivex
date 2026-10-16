/**
 * Demo timeline -- non-clinical content: reviews, message threads, knowledge
 * articles, Health Passport details, profile enrichment, disputes and
 * waitlist entries. All synthetic.
 */

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const REVIEW_COMMENTS: Record<'great' | 'good' | 'mixed' | 'poor', readonly string[]> = {
  great: [
    'Very attentive and explained everything clearly. I left with a plan I actually understood.',
    'Started exactly on time and never felt rushed. Highly recommended.',
    'Listened properly before suggesting anything. I felt genuinely heard.',
    'Clear explanation of the treatment and what to expect in the first weeks.',
    'Kind, practical and thorough. The follow-up summary was really helpful.',
    'Best online consultation I have had. Professional and reassuring.',
    'Took time to answer every question, even the ones I was embarrassed to ask.',
    'Explained the side effects honestly and checked in on them at the next visit.',
    'Very organised: reviewed my previous notes before the call started.',
    'Calm and respectful. I would book again without hesitation.',
  ],
  good: [
    'Good consultation overall, the plan was clear.',
    'Helpful advice; the call started a few minutes late but the doctor was thorough.',
    'Professional and knowledgeable. Would have liked a little more time.',
    'Useful session, the prescription and instructions were easy to follow.',
    'Solid follow-up visit, good progress tracking.',
    'The video dropped once but the doctor called back straight away.',
  ],
  mixed: [
    'Advice was fine but the session felt a bit rushed.',
    'Started 15 minutes late and I had to repeat my history.',
    'OK consultation, but I expected more explanation about the test results.',
  ],
  poor: [
    'The call kept freezing and the doctor seemed distracted.',
    'I did not feel my concerns were taken seriously this time.',
  ],
};

/** Reviews a doctor flags for admin attention (the doctor's own stated reason). */
export const FLAG_REASONS = [
  'This review mentions details of another patient\'s appointment and may breach privacy.',
  'The comment contains a personal accusation unrelated to the consultation.',
];

export const OFFENSIVE_REVIEW_COMMENTS = [
  'Waste of money. This so-called doctor clearly bought his degree.',
  'Saw this doctor treat my cousin badly last week too, avoid at all costs.',
];

// ---------------------------------------------------------------------------
// Message threads -- administrative/follow-up only, never diagnosis-by-chat
// ---------------------------------------------------------------------------
export type MessageScript = readonly { from: 'patient' | 'doctor'; text: string }[];

export const MESSAGE_SCRIPTS: Record<'medication' | 'scheduling' | 'labs' | 'receipt' | 'followUp' | 'document', readonly MessageScript[]> = {
  medication: [
    [
      { from: 'patient', text: 'Hello doctor, is it fine to take {med} in the evening instead of the morning? Mornings are hectic for me.' },
      { from: 'doctor', text: 'Hello {first}, yes, evening is fine as long as you take it at the same time every day. Tell me at our next visit if it affects your sleep.' },
      { from: 'patient', text: 'Great, thank you.' },
    ],
    [
      { from: 'patient', text: 'I missed yesterday\'s dose. Should I take two today?' },
      { from: 'doctor', text: 'No, please don\'t double up. Just take today\'s dose as usual and carry on. One missed dose is not a problem.' },
      { from: 'patient', text: 'Understood, thanks for the quick reply.' },
      { from: 'doctor', text: 'You\'re welcome. A phone reminder can help keep the routine.' },
    ],
    [
      { from: 'patient', text: 'The pharmacy only has a different brand of {med}. Is that OK?' },
      { from: 'doctor', text: 'Yes, the same active ingredient and strength is fine. Keep the same dose.' },
    ],
  ],
  scheduling: [
    [
      { from: 'patient', text: 'Hi doctor, I may be travelling for work next week. Can we keep the appointment by video from my hotel?' },
      { from: 'doctor', text: 'Of course, all our consultations are by video. Just make sure you have a quiet room and a stable connection.' },
      { from: 'patient', text: 'Perfect, see you then.' },
    ],
    [
      { from: 'patient', text: 'Good morning, I booked the wrong slot by mistake. I rescheduled it from the app, I hope that\'s fine.' },
      { from: 'doctor', text: 'Good morning {first}, yes, I can see the new time. See you then.' },
    ],
  ],
  labs: [
    [
      { from: 'patient', text: 'I did the blood tests you requested. I uploaded the report to my records.' },
      { from: 'doctor', text: 'Thank you {first}, I can see it in your documents. We will go through the results together at your next appointment.' },
      { from: 'patient', text: 'Thanks doctor.' },
    ],
    [
      { from: 'doctor', text: 'Hello {first}, a reminder to do the {test} before our next visit so we can review it together.' },
      { from: 'patient', text: 'Noted, I\'ll go to the lab this week.' },
    ],
  ],
  receipt: [
    [
      { from: 'patient', text: 'Could you add a short note for my insurance company that I attended the consultation?' },
      { from: 'doctor', text: 'Sure. You can download the visit summary from your appointments history; it shows the date and my details. If they need a stamped form, send it here.' },
      { from: 'patient', text: 'The summary should be enough, thank you!' },
    ],
  ],
  followUp: [
    [
      { from: 'doctor', text: 'Hello {first}, just checking how the first week on the new plan went.' },
      { from: 'patient', text: 'Much better than I expected, thank you for checking in.' },
      { from: 'doctor', text: 'Glad to hear it. Keep going and we\'ll review properly at the follow-up.' },
    ],
    [
      { from: 'patient', text: 'Quick update: the exercises are helping a lot.' },
      { from: 'doctor', text: 'That\'s great news. Keep them up daily, we\'ll review at your next appointment.' },
    ],
  ],
  document: [
    [
      { from: 'doctor', text: 'I\'ve added a summary document to your records for your other doctors.' },
      { from: 'patient', text: 'Thank you, I see it now.' },
    ],
  ],
};

// ---------------------------------------------------------------------------
// Knowledge Center articles (markdown, rendered + sanitised by the frontend)
// ---------------------------------------------------------------------------
export interface ArticleSpec {
  key: string;
  doctor: string;
  language: 'ENGLISH' | 'ARABIC';
  status: 'PUBLISHED' | 'DRAFT' | 'PENDING_REVIEW' | 'REJECTED' | 'ARCHIVED';
  /** Days before the anchor the article was written. */
  writtenDaysAgo: number;
  title: string;
  body: string;
  sourcesText?: string;
  moderationReason?: string;
  views?: number;
}

export const ARTICLES: ArticleSpec[] = [
  {
    key: 'burnout-signs',
    doctor: 'doctor03',
    language: 'ENGLISH',
    status: 'PUBLISHED',
    writtenDaysAgo: 150,
    views: 412,
    title: 'Recognising burnout before it recognises you',
    body: `Burnout rarely arrives overnight. It builds over months of long hours, little recovery and a growing sense that nothing you do makes a difference.

## Three early signals

- **Exhaustion that weekends don't fix.** You sleep in on Friday and still feel drained on Sunday night.
- **Growing cynicism.** Tasks you used to care about start to feel pointless, and colleagues get on your nerves.
- **Slipping effectiveness.** You work longer but get less done.

## What helps

1. Protect one recovery block every day, even 20 minutes, with no screens.
2. Write down the three demands that drain you most, and talk to your manager about one of them.
3. Keep sleep and meal times regular. Burnout feeds on irregular routines.

Burnout is an occupational problem, not a personal failure. If low mood, hopelessness or poor sleep persist for more than two weeks, book a consultation. These may be signs of depression, which is very treatable.`,
    sourcesText: 'World Health Organization. Burn-out an "occupational phenomenon": International Classification of Diseases (2019).',
  },
  {
    key: 'stress-resets',
    doctor: 'doctor03',
    language: 'ENGLISH',
    status: 'PUBLISHED',
    writtenDaysAgo: 95,
    views: 268,
    title: 'Five-minute stress resets for the workday',
    body: `You don't need an hour of meditation to bring stress down. Short resets, repeated through the day, work better for most busy people.

1. **Box breathing:** breathe in for 4, hold 4, out 4, hold 4. Repeat four times.
2. **The 5-4-3-2-1 check:** name 5 things you see, 4 you hear, 3 you can touch, 2 you smell and 1 you taste.
3. **Shoulder drop:** notice your shoulders, lift them to your ears, then let them fall. Three times.
4. **A two-line list:** write the one task that matters most right now, and the one you can let go of today.
5. **A walk to the window:** two minutes of daylight and distance vision resets tired eyes and a racing mind.

Pick one and attach it to something you already do, like before opening email or after every meeting.`,
  },
  {
    key: 'work-life-ar',
    doctor: 'doctor03',
    language: 'ARABIC',
    status: 'PUBLISHED',
    writtenDaysAgo: 60,
    views: 190,
    title: 'كيف تعيد التوازن بين العمل والحياة؟',
    body: `ساعات العمل الطويلة لا تعني بالضرورة إنتاجية أعلى. مع الوقت، يدفع الجسم والذهن ثمن غياب الراحة.

## خطوات عملية

- **حدد ساعة نهاية ليومك** والتزم بها معظم أيام الأسبوع.
- **افصل الإشعارات** بعد العمل، أو خصص وقتًا محددًا للرد فقط.
- **خصص وقتًا ثابتًا للنوم** واستيقظ في الموعد نفسه حتى في الإجازات.
- **مارس نشاطًا بدنيًا خفيفًا** مثل المشي لمدة ٣٠ دقيقة ثلاث مرات أسبوعيًا.

إذا استمر الشعور بالإرهاق أو فقدان الاهتمام لأكثر من أسبوعين، فلا تتردد في حجز استشارة.`,
  },
  {
    key: 'return-to-work',
    doctor: 'doctor03',
    language: 'ENGLISH',
    status: 'DRAFT',
    writtenDaysAgo: 4,
    title: 'Returning to work after mental-health leave',
    body: `A gradual return protects your recovery. Agree a phased schedule with your employer, start with fewer hours, and plan a check-in after the first two weeks.

(Draft: add a section on talking to colleagues.)`,
  },
  {
    key: 'cbt-practice',
    doctor: 'doctor01',
    language: 'ENGLISH',
    status: 'PUBLISHED',
    writtenDaysAgo: 200,
    views: 530,
    title: 'What CBT actually looks like in practice',
    body: `Cognitive behavioural therapy (CBT) is one of the best-studied treatments for depression and anxiety, but many people are unsure what happens in a session.

## A typical course

- **6-16 sessions**, usually weekly.
- Each session has a short agenda you set together.
- You'll practise skills between sessions, such as noticing unhelpful thoughts or gradually returning to activities you have been avoiding.

## What it is not

CBT is not just "positive thinking", and it doesn't ignore real problems. It helps you test whether a thought fits the facts, and choose actions that move you towards what matters.

CBT works well alone for mild-to-moderate symptoms, and alongside medication when symptoms are more severe.`,
    sourcesText: 'NICE guideline NG222: Depression in adults: treatment and management (2022).',
  },
  {
    key: 'depression-not-weakness-ar',
    doctor: 'doctor01',
    language: 'ARABIC',
    status: 'PUBLISHED',
    writtenDaysAgo: 120,
    views: 344,
    title: 'الاكتئاب ليس ضعفًا في الشخصية',
    body: `الاكتئاب حالة طبية شائعة يمكن علاجها، وليس دليلًا على ضعف الإرادة.

## علامات تستحق الانتباه

- حزن أو فقدان للاهتمام معظم اليوم لمدة أسبوعين أو أكثر
- اضطراب في النوم أو الشهية
- صعوبة في التركيز وشعور بالذنب أو انعدام القيمة

العلاج النفسي والأدوية، أو الجمع بينهما، يساعدان معظم المرضى على التعافي. إذا راودتك أفكار بإيذاء نفسك، فاطلب المساعدة فورًا.`,
  },
  {
    key: 'exam-anxiety',
    doctor: 'doctor02',
    language: 'ENGLISH',
    status: 'PUBLISHED',
    writtenDaysAgo: 110,
    views: 615,
    title: 'Exam anxiety: a practical plan for students',
    body: `Some nerves before an exam are normal, and even helpful. When anxiety blocks studying or sleep, a plan helps.

- **Break revision into 40-minute blocks** with 10-minute breaks.
- **Practise under exam conditions** at least once a week.
- **Keep sleep regular**: memory consolidates during sleep, so all-nighters backfire.
- **On the day:** slow breathing before you start, and skip any question that freezes you; come back to it later.

If panic attacks, avoidance or low mood persist after exams end, it's worth talking to a professional.`,
  },
  {
    key: 'panic-attack',
    doctor: 'doctor04',
    language: 'ENGLISH',
    status: 'PENDING_REVIEW',
    writtenDaysAgo: 3,
    title: 'What to do during a panic attack',
    body: `A panic attack feels frightening but is not dangerous. It peaks within about 10 minutes and passes.

1. Name it: "This is a panic attack, it will pass."
2. Slow your breathing: out for longer than in.
3. Stay where you are if it's safe. Leaving teaches your brain the place was dangerous.

If attacks keep returning, treatment with CBT and sometimes medication works very well.`,
  },
  {
    key: 'postpartum-ar',
    doctor: 'doctor06',
    language: 'ARABIC',
    status: 'PUBLISHED',
    writtenDaysAgo: 140,
    views: 288,
    title: 'الحزن بعد الولادة: متى تطلبين المساعدة؟',
    body: `يشعر كثير من الأمهات بتقلبات في المزاج خلال الأسبوعين الأولين بعد الولادة، وهذا أمر شائع ويزول عادة من تلقاء نفسه.

## متى يكون الأمر أكثر من ذلك؟

- إذا استمر الحزن أو القلق أكثر من أسبوعين
- إذا شعرتِ بالانفصال عن طفلك أو بالذنب المستمر
- إذا كانت هناك صعوبة كبيرة في النوم حتى عندما ينام الطفل

اكتئاب ما بعد الولادة قابل للعلاج، وبعض الأدوية آمنة أثناء الرضاعة. تحدثي مع طبيبك ولا تترددي في طلب الدعم من العائلة.`,
  },
  {
    key: 'ocd-not-tidy',
    doctor: 'doctor07',
    language: 'ENGLISH',
    status: 'PUBLISHED',
    writtenDaysAgo: 175,
    views: 377,
    title: 'OCD is not about being tidy',
    body: `"I'm so OCD" is often used to mean someone likes order. Real obsessive-compulsive disorder is very different.

- **Obsessions** are unwanted, distressing thoughts or images that keep returning.
- **Compulsions** are rituals done to reduce that distress, such as washing, checking or mental counting, often for hours a day.

The good news: exposure and response prevention (ERP), sometimes combined with an SSRI, helps most people take back hours of their day. Early treatment matters.`,
  },
  {
    key: 'sleep-hygiene',
    doctor: 'doctor10',
    language: 'ENGLISH',
    status: 'PENDING_REVIEW',
    writtenDaysAgo: 2,
    title: 'Sleep hygiene that actually works',
    body: `Keep the same wake time every day, use the bed only for sleep, and get up if you're awake for more than 20 minutes. Caffeine after 2 pm and screens in bed are the two most common culprits we see.`,
  },
  {
    key: 'home-bp',
    doctor: 'doctor12',
    language: 'ENGLISH',
    status: 'PUBLISHED',
    writtenDaysAgo: 185,
    views: 702,
    title: 'Measuring blood pressure correctly at home',
    body: `Home readings are only useful if they're taken the same way every time.

- Sit quietly for **5 minutes** first, back supported, feet flat, arm resting at heart level.
- Use the **right cuff size**: a cuff that's too small gives falsely high readings.
- Take **two readings one minute apart**, morning and evening, for 7 days before your appointment.
- No coffee, smoking or exercise for 30 minutes beforehand.

Bring the log to your consultation. It is often more informative than a single clinic reading.`,
    sourcesText: 'European Society of Hypertension practice guidelines for home blood pressure monitoring.',
  },
  {
    key: 'salt-ar',
    doctor: 'doctor12',
    language: 'ARABIC',
    status: 'PUBLISHED',
    writtenDaysAgo: 80,
    views: 251,
    title: 'الملح وضغط الدم: ما الذي يجب أن تعرفه؟',
    body: `تقليل الملح من أبسط الطرق لخفض ضغط الدم.

- الحد الموصى به أقل من ٥ جرامات يوميًا، أي ما يعادل ملعقة صغيرة تقريبًا
- معظم الملح يأتي من الخبز والجبن والأطعمة المصنعة، وليس من المملحة فقط
- استخدم الأعشاب والليمون لإضافة النكهة بدلًا من الملح

قد يستغرق التعود على طعم أقل ملوحة أسبوعين إلى ثلاثة أسابيع فقط.`,
  },
  {
    key: 'acne-myths',
    doctor: 'doctor14',
    language: 'ENGLISH',
    status: 'PUBLISHED',
    writtenDaysAgo: 165,
    views: 489,
    title: 'Acne myths dermatologists hear every day',
    body: `**"Acne means your skin is dirty."** Over-washing actually irritates the skin and can make acne worse.

**"Toothpaste dries out spots."** It irritates the skin and can leave dark marks.

**"Treatment works in a week."** Most acne treatments need 8-12 weeks to show their full effect, so don't give up too early.

**"Sunscreen causes breakouts."** Non-comedogenic sunscreens are safe, and essential if you use retinoids.`,
  },
  {
    key: 'sunscreen-summer',
    doctor: 'doctor14',
    language: 'ENGLISH',
    status: 'ARCHIVED',
    writtenDaysAgo: 210,
    views: 96,
    title: 'Sunscreen in the Egyptian summer',
    body: `Reapply every two hours outdoors, use SPF 30 or higher, and don't forget the ears and neck.`,
  },
  {
    key: 'prediabetes-window',
    doctor: 'doctor16',
    language: 'ENGLISH',
    status: 'PUBLISHED',
    writtenDaysAgo: 130,
    views: 356,
    title: 'Prediabetes: the window to act',
    body: `Prediabetes (intermediate hyperglycaemia) means blood sugar is higher than normal, but not yet in the diabetes range. It is a warning, and an opportunity.

- **Lose 5-7% of body weight** if you are overweight. This alone substantially lowers the risk of progression.
- **Move 150 minutes a week**: brisk walking counts.
- **Swap sugary drinks** for water or unsweetened tea.
- **Recheck HbA1c** every 6-12 months as your doctor advises.

Many people with prediabetes return to normal blood sugar with these changes.`,
  },
  {
    key: 'ramadan-diabetes',
    doctor: 'doctor16',
    language: 'ENGLISH',
    status: 'REJECTED',
    writtenDaysAgo: 40,
    title: 'Adjusting diabetes medication during Ramadan',
    body: `Most people on metformin can fast safely by moving doses to iftar and suhoor.`,
    moderationReason: 'Please add clear guidance that dose changes must be agreed with the treating doctor, and cover hypoglycaemia warning signs. Resubmit as a new article.',
  },
  {
    key: 'rhinitis-season',
    doctor: 'doctor19',
    language: 'ENGLISH',
    status: 'PUBLISHED',
    writtenDaysAgo: 190,
    views: 298,
    title: 'Allergic rhinitis season survival guide',
    body: `- **Start your nasal spray two weeks before your usual season** and use it daily, not just on bad days.
- **Aim the spray away from the middle of the nose** to avoid irritation and nosebleeds.
- **Shower and change clothes** after time outdoors on high-pollen days.
- **Rinse with saline** to clear allergens.

If one side of the nose is always blocked, or you have nosebleeds or loss of smell, see an ENT specialist.`,
  },
  {
    key: 'child-fever-ar',
    doctor: 'doctor15',
    language: 'ARABIC',
    status: 'PUBLISHED',
    writtenDaysAgo: 155,
    views: 541,
    title: 'حرارة الطفل: متى تقلق؟',
    body: `الحرارة استجابة طبيعية للعدوى، وليست مرضًا في حد ذاتها.

## اطلب المساعدة فورًا إذا:

- كان عمر الطفل أقل من ٣ أشهر وحرارته ٣٨ درجة أو أكثر
- ظهر طفح جلدي لا يختفي عند الضغط عليه
- كان الطفل خاملًا بشكل غير معتاد أو يجد صعوبة في التنفس
- استمرت الحرارة أكثر من ٣ أيام

احرص على أن يشرب الطفل كمية كافية من السوائل، واستخدم خافض الحرارة بالجرعة المناسبة لوزنه.`,
  },
  {
    key: 'desk-posture',
    doctor: 'doctor17',
    language: 'ENGLISH',
    status: 'DRAFT',
    writtenDaysAgo: 9,
    title: 'Desk posture and back pain',
    body: `Screen at eye level, elbows at 90 degrees, feet flat. Stand up every 45 minutes.`,
  },
];

// ---------------------------------------------------------------------------
// Patient profile enrichment
// ---------------------------------------------------------------------------
export interface PatientEnrichment {
  address: string;
  chronicDiseases?: string;
  allergies?: string;
  /** 'none_reported' | 'has_allergies' | 'unknown' -- has_allergies is derived from `allergies`. */
  allergiesStatus: 'none_reported' | 'has_allergies' | 'unknown';
  /** A treating doctor's "no known allergies" attestation. */
  allergiesConfirmedNoneBy?: string;
  bloodType?: string;
  extraEmergencyContact?: { name: string; relationship: 'PARENT' | 'SPOUSE' | 'SIBLING' | 'CHILD' | 'OTHER'; phoneNumber: string };
  passport: {
    lifestyle: string;
    nutrition: string;
    exercise: string;
    mentalHealth?: string;
    entries: { category: 'VACCINATION' | 'FAMILY_HISTORY' | 'SURGERY' | 'MEDICATION'; title: string; detail?: string; occurredYearsAgo?: number }[];
  };
}

const COMMON_VACCINES = [
  { category: 'VACCINATION' as const, title: 'COVID-19 booster', detail: 'mRNA vaccine', occurredYearsAgo: 3 },
  { category: 'VACCINATION' as const, title: 'Seasonal influenza', detail: 'Annual flu shot', occurredYearsAgo: 1 },
];

export const PATIENT_ENRICHMENT: Record<string, PatientEnrichment> = {
  patient01: {
    address: '14 El-Nozha Street, Heliopolis, Cairo',
    chronicDiseases: 'Recurrent depression (in treatment)',
    allergiesStatus: 'none_reported',
    allergiesConfirmedNoneBy: 'doctor01',
    passport: {
      lifestyle: 'Software engineer, mostly remote. Non-smoker. Coffee 2 cups a day.',
      nutrition: 'Home-cooked meals most days; trying to cut late-night snacking.',
      exercise: 'Walks 30 minutes most evenings; football on Fridays.',
      mentalHealth: 'Weekly CBT sessions since spring.',
      entries: [...COMMON_VACCINES, { category: 'FAMILY_HISTORY', title: 'Mother: type 2 diabetes' }, { category: 'MEDICATION', title: 'Sertraline 100 mg once daily' }],
    },
  },
  patient02: {
    address: '7 Mohamed Mazhar Street, Zamalek, Cairo',
    chronicDiseases: 'None',
    allergiesStatus: 'none_reported',
    passport: {
      lifestyle: 'Sales manager, frequent travel. Quit smoking this year.',
      nutrition: 'Eats out often during the week.',
      exercise: 'Gym twice a week.',
      entries: [COMMON_VACCINES[0], { category: 'FAMILY_HISTORY', title: 'Father: hypertension' }],
    },
  },
  patient03: {
    address: '22 Abbas El-Akkad Street, Nasr City, Cairo',
    chronicDiseases: 'Mild depression (in treatment); seasonal allergic rhinitis; borderline fasting glucose under monitoring',
    allergiesStatus: 'has_allergies',
    passport: {
      lifestyle: 'Accountant, long hours at the desk during closing periods. Non-smoker. Two coffees a day.',
      nutrition: 'Cutting down on sugary drinks and white bread since the glucose result.',
      exercise: 'Brisk walking 4 times a week, about 35 minutes.',
      mentalHealth: 'Monthly follow-up with Dr. Youssef Mahmoud; feeling much better since the spring.',
      entries: [
        ...COMMON_VACCINES,
        { category: 'VACCINATION', title: 'Hepatitis B (3 doses)', detail: 'Completed course', occurredYearsAgo: 15 },
        { category: 'FAMILY_HISTORY', title: 'Father: type 2 diabetes', detail: 'Diagnosed at 55' },
        { category: 'FAMILY_HISTORY', title: 'Father: myocardial infarction at 62' },
        { category: 'SURGERY', title: 'Appendectomy', detail: 'Laparoscopic, no complications', occurredYearsAgo: 16 },
        { category: 'MEDICATION', title: 'Escitalopram 15 mg once daily' },
        { category: 'MEDICATION', title: 'Fluticasone nasal spray during pollen season' },
      ],
    },
  },
  patient04: {
    address: '9 Ahmed Orabi Street, Mohandessin, Giza',
    chronicDiseases: 'Panic disorder (in treatment)',
    allergiesStatus: 'none_reported',
    passport: {
      lifestyle: 'Graduate student. Non-smoker.',
      nutrition: 'Irregular meals during exams.',
      exercise: 'Yoga twice a week.',
      entries: [COMMON_VACCINES[0]],
    },
  },
  patient05: {
    address: '31 El-Thawra Street, Heliopolis, Cairo',
    chronicDiseases: 'None',
    allergiesStatus: 'none_reported',
    extraEmergencyContact: { name: 'Hoda Mansour', relationship: 'PARENT', phoneNumber: '+201005987654' },
    passport: {
      lifestyle: 'On maternity leave; first baby born this year.',
      nutrition: 'Breastfeeding; iron-rich diet as advised.',
      exercise: 'Short walks with the stroller.',
      mentalHealth: 'Postpartum follow-up with Dr. Dina El-Masry.',
      entries: [...COMMON_VACCINES, { category: 'SURGERY', title: 'Caesarean section', occurredYearsAgo: 1 }, { category: 'MEDICATION', title: 'Ferrous sulfate 200 mg daily' }],
    },
  },
  patient06: {
    address: '5 Gamal Abdel Nasser Road, Smouha, Alexandria',
    chronicDiseases: 'Type 2 diabetes; high cholesterol',
    allergiesStatus: 'none_reported',
    allergiesConfirmedNoneBy: 'doctor16',
    bloodType: 'A+',
    passport: {
      lifestyle: 'Teacher. Non-smoker.',
      nutrition: 'Diabetic diet, counting carbohydrates at lunch.',
      exercise: 'Walks 20 minutes after dinner.',
      entries: [
        ...COMMON_VACCINES,
        { category: 'FAMILY_HISTORY', title: 'Both parents: type 2 diabetes' },
        { category: 'MEDICATION', title: 'Metformin 1000 mg twice daily' },
        { category: 'MEDICATION', title: 'Atorvastatin 20 mg at night' },
      ],
    },
  },
  patient07: {
    address: '18 Mostafa El-Nahas Street, Nasr City, Cairo',
    chronicDiseases: 'Generalised anxiety (in treatment)',
    allergiesStatus: 'none_reported',
    passport: {
      lifestyle: 'University student, lives with family.',
      nutrition: 'Skips breakfast often.',
      exercise: 'Swimming once a week.',
      entries: [COMMON_VACCINES[0]],
    },
  },
  patient08: {
    address: '40 El-Haram Street, Giza',
    chronicDiseases: 'Hypertension; knee osteoarthritis',
    allergies: 'Sulfonamide antibiotics (rash)',
    allergiesStatus: 'has_allergies',
    passport: {
      lifestyle: 'Retired civil engineer. Ex-smoker (quit 10 years ago).',
      nutrition: 'Low-salt diet since diagnosis.',
      exercise: 'Stationary bike 20 minutes daily.',
      entries: [
        ...COMMON_VACCINES,
        { category: 'VACCINATION', title: 'Pneumococcal vaccine', occurredYearsAgo: 2 },
        { category: 'SURGERY', title: 'Inguinal hernia repair', occurredYearsAgo: 8 },
        { category: 'MEDICATION', title: 'Amlodipine 5 mg + losartan 50 mg daily' },
      ],
    },
  },
  patient09: {
    address: '12 Syria Street, Mohandessin, Giza',
    chronicDiseases: 'Recurrent depression (in treatment)',
    allergiesStatus: 'none_reported',
    passport: {
      lifestyle: 'HR specialist, mother of a toddler.',
      nutrition: 'Balanced; tries to avoid fast food.',
      exercise: 'Pilates once a week.',
      entries: [COMMON_VACCINES[0], { category: 'FAMILY_HISTORY', title: 'Sister: thyroid disease' }],
    },
  },
  patient10: {
    address: '3 Shubra Street, Shubra, Cairo',
    allergiesStatus: 'unknown',
    passport: {
      lifestyle: 'Logistics coordinator; heavy lifting at work. Quit smoking with treatment.',
      nutrition: 'Large late dinners.',
      exercise: 'Started core exercises from physiotherapy.',
      entries: [],
    },
  },
  patient11: {
    address: '27 Port Said Street, Sporting, Alexandria',
    chronicDiseases: 'OCD (in treatment); allergic rhinitis',
    allergiesStatus: 'has_allergies',
    passport: {
      lifestyle: 'Architect.',
      nutrition: 'Avoids shellfish strictly.',
      exercise: 'Cycling at weekends.',
      entries: [...COMMON_VACCINES, { category: 'MEDICATION', title: 'Fluoxetine 40 mg daily' }],
    },
  },
  patient12: {
    address: '16 Makram Ebeid Street, Nasr City, Cairo',
    allergiesStatus: 'none_reported',
    bloodType: 'O+',
    passport: {
      lifestyle: 'Recently moved to Cairo for a new job.',
      nutrition: 'Mostly delivery food since the move.',
      exercise: 'None at the moment.',
      entries: [COMMON_VACCINES[0]],
    },
  },
  patient13: {
    address: '8 Road 9, Maadi, Cairo',
    chronicDiseases: 'Bipolar II disorder (stable on treatment)',
    allergiesStatus: 'none_reported',
    allergiesConfirmedNoneBy: 'doctor05',
    passport: {
      lifestyle: 'Marketing executive; father of a young son.',
      nutrition: 'Regular meals; limits alcohol to none.',
      exercise: '5-a-side football weekly.',
      mentalHealth: 'Keeps a daily mood chart.',
      entries: [COMMON_VACCINES[0], { category: 'MEDICATION', title: 'Lamotrigine 200 mg daily' }],
    },
  },
  patient14: {
    address: '21 Faisal Street, Giza',
    chronicDiseases: 'Generalised anxiety (in treatment)',
    allergiesStatus: 'none_reported',
    passport: {
      lifestyle: 'Junior accountant; first job.',
      nutrition: 'Light breakfast, big lunch.',
      exercise: 'Dancing class twice a week.',
      entries: [],
    },
  },
  patient15: {
    address: '11 El-Merghany Street, Heliopolis, Cairo',
    chronicDiseases: 'Asthma since childhood',
    allergies: 'Aspirin and ibuprofen (wheezing)',
    allergiesStatus: 'has_allergies',
    passport: {
      lifestyle: 'Bank branch manager. Non-smoker.',
      nutrition: 'Regular meals.',
      exercise: 'Swimming twice a week, inhaler before.',
      entries: [
        ...COMMON_VACCINES,
        { category: 'MEDICATION', title: 'Budesonide/formoterol inhaler twice daily' },
        { category: 'FAMILY_HISTORY', title: 'Mother: asthma' },
      ],
    },
  },
  patient16: {
    address: '6 Hassan Assem Street, Zamalek, Cairo',
    chronicDiseases: 'Generalised anxiety (in treatment)',
    allergiesStatus: 'none_reported',
    bloodType: 'B+',
    extraEmergencyContact: { name: 'Samia Fawzy', relationship: 'SIBLING', phoneNumber: '+201016987654' },
    passport: {
      lifestyle: 'Interior designer; mother of a 3-year-old.',
      nutrition: 'Mediterranean-style meals.',
      exercise: 'Morning walks at the club.',
      mentalHealth: 'Practising breathing exercises daily.',
      entries: [...COMMON_VACCINES, { category: 'MEDICATION', title: 'Sertraline 50 mg daily' }],
    },
  },
  patient17: {
    address: '2 El-Galaa Street, Downtown, Cairo',
    allergiesStatus: 'unknown',
    passport: { lifestyle: 'Freelance photographer.', nutrition: 'Irregular.', exercise: 'Occasional running.', entries: [] },
  },
  patient18: {
    address: '19 Road 233, Degla, Maadi, Cairo',
    chronicDiseases: 'Recurrent depression; hypothyroidism',
    allergiesStatus: 'none_reported',
    passport: {
      lifestyle: 'Pharmacist; two children.',
      nutrition: 'Takes levothyroxine before breakfast as advised.',
      exercise: 'Treadmill 3 times a week.',
      entries: [
        ...COMMON_VACCINES,
        { category: 'MEDICATION', title: 'Levothyroxine 50 mcg daily' },
        { category: 'SURGERY', title: 'Caesarean section', occurredYearsAgo: 4 },
      ],
    },
  },
  patient19: {
    address: '33 El-Nasr Road, Ain Shams, Cairo',
    allergiesStatus: 'unknown',
    passport: { lifestyle: 'Final-year engineering student.', nutrition: 'Student canteen meals.', exercise: 'Gym three times a week.', entries: [] },
  },
  patient20: {
    address: '4 Fouad Street, Downtown, Alexandria',
    allergiesStatus: 'none_reported',
    bloodType: 'O-',
    passport: {
      lifestyle: 'Medical student.',
      nutrition: 'Vegetarian.',
      exercise: 'Yoga at home.',
      entries: [COMMON_VACCINES[0], { category: 'VACCINATION', title: 'Hepatitis B (3 doses)', occurredYearsAgo: 2 }],
    },
  },
};

// ---------------------------------------------------------------------------
// Doctor profile enrichment (added alongside, never replacing, the seed's own entries)
// ---------------------------------------------------------------------------
export interface DoctorEnrichment {
  publications?: { title: string; reference: string; monthsAgo: number }[];
  awards?: { title: string; issuingBody: string; monthsAgo: number }[];
  experience?: { organizationName: string; position: string; rank?: string; yearsAgo: number; yearsDuration: number; description: string }[];
  extraLanguages?: string[];
  maxFreeSlotsPerDay?: number;
}

export const DOCTOR_ENRICHMENT: Record<string, DoctorEnrichment> = {
  doctor03: {
    publications: [{ title: 'Brief Problem-Solving Therapy for Adjustment Disorder in Office Workers', reference: 'Middle East Current Psychiatry', monthsAgo: 22 }],
    awards: [{ title: 'Best Clinical Poster, Annual Psychiatry Congress', issuingBody: 'Egyptian Psychiatric Association', monthsAgo: 14 }],
    experience: [
      { organizationName: 'Ain Shams University Hospitals', position: 'Psychiatry Resident', rank: 'resident', yearsAgo: 8, yearsDuration: 3, description: 'Rotations in adult inpatient, liaison and outpatient psychiatry.' },
    ],
  },
  doctor01: { experience: [{ organizationName: 'Kasr Al Ainy Hospital', position: 'Assistant Lecturer of Psychiatry', rank: 'specialist', yearsAgo: 12, yearsDuration: 6, description: 'Taught undergraduate psychiatry and ran the CBT training clinic.' }] },
  doctor04: { maxFreeSlotsPerDay: 6 },
  doctor10: { maxFreeSlotsPerDay: 6, extraLanguages: ['fr'] },
  doctor12: { publications: [{ title: 'Home Blood Pressure Monitoring Adherence in Egyptian Adults', reference: 'Egyptian Heart Journal', monthsAgo: 9 }] },
  doctor14: { awards: [{ title: 'Excellence in Teledermatology', issuingBody: 'Egyptian Society of Dermatology', monthsAgo: 7 }] },
  doctor16: { experience: [{ organizationName: 'National Institute of Diabetes and Endocrinology', position: 'Internal Medicine Specialist', rank: 'specialist', yearsAgo: 10, yearsDuration: 4, description: 'Diabetes outpatient clinic and patient education programme.' }] },
  doctor19: { extraLanguages: ['de'] },
  doctor20: { maxFreeSlotsPerDay: 8 },
};

/** Real-world-plausible addresses for the seeded hospitals (the original seed wrote "Cairo, Egypt" for all three). */
export const HOSPITAL_ADDRESSES: Record<string, string> = {
  'Cairo International Hospital': 'Nasr City, Cairo, Egypt',
  'Nile Medical Center': 'Zamalek, Cairo, Egypt',
  'Alexandria General Hospital': 'Smouha, Alexandria, Egypt',
};

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------
export interface DisputeSpec {
  key: string;
  raisedBy: 'patient' | 'doctor';
  /** Which appointment: picked by the planner from the pair's real appointments with this status. */
  doctor: string;
  patient: string;
  appointmentStatus: 'completed' | 'no_show' | 'cancelled';
  category: 'NO_SHOW' | 'PAYMENT_REFUND' | 'CONDUCT' | 'TECHNICAL_ISSUE' | 'OTHER';
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'WITHDRAWN';
  reason: string;
  resolutionNotes?: string;
  /** Days after the appointment the dispute was raised / decided. */
  raisedAfterDays: number;
  decidedAfterDays?: number;
}

export const DISPUTES: DisputeSpec[] = [
  {
    key: 'doctor03-noshow',
    raisedBy: 'doctor',
    doctor: 'doctor03',
    patient: 'patient10',
    appointmentStatus: 'no_show',
    category: 'NO_SHOW',
    status: 'RESOLVED',
    reason: 'The patient did not join the call and did not respond to two messages during the slot. Requesting that the no-show is recorded.',
    resolutionNotes: 'Session logs confirm the patient never joined. No-show recorded; no refund due under the booking terms.',
    raisedAfterDays: 1,
    decidedAfterDays: 3,
  },
  {
    key: 'doctor03-technical',
    raisedBy: 'patient',
    doctor: 'doctor03',
    patient: 'patient15',
    appointmentStatus: 'completed',
    category: 'TECHNICAL_ISSUE',
    status: 'OPEN',
    reason: 'The video froze for about ten minutes in the middle of the session, so we lost a large part of the consultation time.',
    raisedAfterDays: 1,
  },
  {
    key: 'patient03-refund',
    raisedBy: 'patient',
    doctor: 'doctor12',
    patient: 'patient03',
    appointmentStatus: 'cancelled',
    category: 'PAYMENT_REFUND',
    status: 'RESOLVED',
    reason: 'The doctor cancelled my appointment but I could not see the refund in my bank account after five days.',
    resolutionNotes: 'Refund was issued on the day of cancellation; bank processing took 7 working days. Patient informed and confirmed receipt.',
    raisedAfterDays: 5,
    decidedAfterDays: 2,
  },
  {
    key: 'conduct-dismissed',
    raisedBy: 'patient',
    doctor: 'doctor13',
    patient: 'patient08',
    appointmentStatus: 'completed',
    category: 'CONDUCT',
    status: 'DISMISSED',
    reason: 'The doctor did not want to prescribe the medication I asked for.',
    resolutionNotes: 'Reviewed the consultation record: the treating doctor explained a clinical reason for not prescribing. No conduct issue found.',
    raisedAfterDays: 2,
    decidedAfterDays: 4,
  },
  {
    key: 'withdrawn-other',
    raisedBy: 'patient',
    doctor: 'doctor14',
    patient: 'patient20',
    appointmentStatus: 'completed',
    category: 'OTHER',
    status: 'WITHDRAWN',
    reason: 'I could not find my prescription after the visit.',
    raisedAfterDays: 1,
  },
  {
    key: 'refund-open',
    raisedBy: 'patient',
    doctor: 'doctor17',
    patient: 'patient19',
    appointmentStatus: 'completed',
    category: 'PAYMENT_REFUND',
    status: 'OPEN',
    reason: 'I was charged the full fee although the consultation ended after ten minutes because of a power cut on my side. Asking for a partial refund.',
    raisedAfterDays: 2,
  },
];

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------
export const WAITLIST: { patient: string; doctor: string; status: 'WAITING' | 'NOTIFIED' | 'FULFILLED' | 'CANCELLED'; createdDaysAgo: number; rangeDays: [number, number] }[] = [
  { patient: 'patient03', doctor: 'doctor08', status: 'WAITING', createdDaysAgo: 3, rangeDays: [2, 20] },
  { patient: 'patient07', doctor: 'doctor01', status: 'WAITING', createdDaysAgo: 6, rangeDays: [1, 25] },
  { patient: 'patient14', doctor: 'doctor07', status: 'NOTIFIED', createdDaysAgo: 9, rangeDays: [-2, 14] },
  { patient: 'patient12', doctor: 'doctor05', status: 'FULFILLED', createdDaysAgo: 40, rangeDays: [-38, -20] },
  { patient: 'patient19', doctor: 'doctor08', status: 'CANCELLED', createdDaysAgo: 25, rangeDays: [-23, -5] },
  { patient: 'patient16', doctor: 'doctor12', status: 'WAITING', createdDaysAgo: 2, rangeDays: [3, 28] },
];
