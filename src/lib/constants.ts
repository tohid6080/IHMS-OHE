import type { Role, SectionKey, SystemKey } from './types'

// ─── برچسب‌ها ───
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'مدیر سامانه',
  MANAGER: 'مدیر مرکز طب کار',
  HSE: 'کارشناس بهداشت حرفه‌ای',
  DOCTOR: 'پزشک متخصص طب کار',
  AUDIOLOGIST: 'ادیولوژیست',
  OPTOMETRIST: 'اپتومتریست',
  LAB: 'کاربر آزمایشگاه',
  EMPLOYER: 'کارفرما',
  CONTRACTOR: 'پیمانکار',
}

export const EXAM_TYPE_LABELS: Record<string, string> = {
  PRE_EMPLOYMENT: 'بدو استخدام',
  PERIODIC: 'دوره‌ای',
  SPECIFIC: 'موردی',
}

export const GROUP_TYPE_LABELS: Record<string, string> = {
  CONTRACTOR: 'کارکنان پیمانکار',
  DIRECT: 'کارکنان مستقیم کارفرما',
  INDEPENDENT: 'فرد مستقل',
}

export const SECTION_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'انجام نشده',
  IN_PROGRESS: 'در حال انجام',
  SENT_FOR_REVIEW: 'ارسال برای بررسی',
  NEEDS_CORRECTION: 'نیازمند اصلاح',
  APPROVED: 'تأیید شده',
  NOT_APPLICABLE: 'نامرتبط',
}

export const FINAL_OPINION_LABELS: Record<string, string> = {
  FIT: 'بلامانع',
  CONDITIONAL: 'مشروط',
  UNFIT: 'عدم صلاحیت / عدم تناسب پزشکی',
  INCOMPLETE: 'پرونده ناتمام',
}

export const MARITAL_LABELS: Record<string, string> = { SINGLE: 'مجرد', MARRIED: 'متأهل' }
export const GENDER_LABELS: Record<string, string> = { MALE: 'مرد', FEMALE: 'زن' }
export const MILITARY_LABELS: Record<string, string> = {
  DONE: 'خدمت کرده',
  EXEMPT: 'معاف',
  PENDING: 'پایان خدمت نکرده',
}

export const EDUCATION_OPTIONS = ['زیر دیپلم', 'دیپلم', 'کاردانی', 'کارشناسی', 'کارشناسی ارشد', 'دکتری']

// ─── تعریف بخش‌ها و گردش کار ───
export interface SectionDef {
  key: SectionKey
  number: string
  title: string
  editorRoles: Role[] // ثبت اطلاعات
  approverRoles: Role[] // تأیید نهایی
  required: boolean // برای صدور نظریه نهایی قطعی
}

export const SECTION_DEFS: SectionDef[] = [
  { key: 'S2', number: '۲', title: 'سوابق شغلی', editorRoles: ['MANAGER', 'ADMIN'], approverRoles: ['MANAGER', 'ADMIN'], required: true },
  { key: 'S3', number: '۳', title: 'ارزیابی عوامل زیان‌آور شغلی', editorRoles: ['HSE', 'ADMIN'], approverRoles: ['HSE', 'ADMIN'], required: true },
  { key: 'S4', number: '۴', title: 'سابقه شخصی، خانوادگی و پزشکی', editorRoles: ['DOCTOR', 'ADMIN'], approverRoles: ['DOCTOR', 'ADMIN'], required: true },
  { key: 'S5', number: '۵', title: 'معاینات بالینی', editorRoles: ['DOCTOR', 'ADMIN'], approverRoles: ['DOCTOR', 'ADMIN'], required: true },
  { key: 'S6', number: '۶', title: 'آزمایش‌ها', editorRoles: ['LAB', 'DOCTOR', 'ADMIN'], approverRoles: ['DOCTOR', 'ADMIN'], required: true },
  { key: 'S7A', number: '۷-الف', title: 'اپتومتری', editorRoles: ['OPTOMETRIST', 'ADMIN'], approverRoles: ['DOCTOR', 'ADMIN'], required: true },
  { key: 'S7B', number: '۷-ب', title: 'ادیومتری', editorRoles: ['AUDIOLOGIST', 'ADMIN'], approverRoles: ['AUDIOLOGIST', 'ADMIN'], required: true },
  { key: 'S7C', number: '۷-ج', title: 'اسپیرومتری', editorRoles: ['LAB', 'DOCTOR', 'ADMIN'], approverRoles: ['DOCTOR', 'ADMIN'], required: true },
  { key: 'S7D', number: '۷-د', title: 'سایر اقدامات پاراکلینیکی', editorRoles: ['LAB', 'DOCTOR', 'ADMIN'], approverRoles: ['DOCTOR', 'ADMIN'], required: true },
  { key: 'S8', number: '۸', title: 'مشاوره‌ها و نتایج ارجاع‌ها', editorRoles: ['DOCTOR', 'ADMIN'], approverRoles: ['DOCTOR', 'ADMIN'], required: true },
  { key: 'S9', number: '۹', title: 'نظریه نهایی پزشک', editorRoles: ['DOCTOR', 'ADMIN'], approverRoles: ['DOCTOR', 'ADMIN'], required: true },
]

export const SECTION_RESPONSIBLE: Record<SectionKey, Role> = {
  S2: 'MANAGER',
  S3: 'HSE',
  S4: 'DOCTOR',
  S5: 'DOCTOR',
  S6: 'LAB',
  S7A: 'OPTOMETRIST',
  S7B: 'AUDIOLOGIST',
  S7C: 'LAB',
  S7D: 'LAB',
  S8: 'DOCTOR',
  S9: 'DOCTOR',
}

// ─── بخش ۳: عوامل زیان‌آور ───
export const FACTOR_GROUPS = {
  physical: ['سر و صدا', 'ارتعاش', 'اشعه غیر یونیزان', 'اشعه یونیزان'],
  chemical: ['گرد و غبار', 'دمه فلزات', 'حلال‌ها', 'اسید و باز', 'گازها'],
  biological: ['باکتری', 'ویروس', 'قارچ', 'انگل'],
  ergonomic: ['ایستادن یا نشستن طولانی مدت', 'کار تکراری', 'حمل و نقل بار سنگین', 'وضعیت بدنی نامناسب'],
  psychological: ['نوبت کاری', 'استرسورهای شغلی'],
} as const

export const FACTOR_GROUP_LABELS: Record<keyof typeof FACTOR_GROUPS, string> = {
  physical: 'فیزیکی',
  chemical: 'شیمیایی',
  biological: 'بیولوژیکی',
  ergonomic: 'ارگونومیکی',
  psychological: 'روانی',
}

// ─── بخش ۴: سؤالات ───
export const SECTION4_QUESTIONS = [
  'آیا سابقه بیماری دارید؟',
  'در صورت ابتلا به بیماری آیا معمولاً شما را در محیط کار توقف می‌کند؟',
  'در صورت ابتلا به بیماری آیا همکارانتان معمولاً شما را مبتلا به بیماری می‌کنند؟',
  'در صورت ابتلا به بیماری آیا معمولاً شما در زمان تعطیلات و مرخصی بهبود می‌یابید؟',
  'آیا به غذا، دارو یا ماده خاصی حساسیت دارید؟',
  'سابقه بستری در بیمارستان به چه دلیل؟',
  'آیا سابقه عمل جراحی دارید؟',
  'آیا سابقه سرطان یا بیماری مزمن در فامیل دارید؟',
  'آیا داروی خاص مصرف می‌کنید؟',
  'آیا اکنون سیگار می‌کشید؟',
  'آیا سابقه قبلی مصرف سیگار دارید؟',
  'آیا در اوقات فراغت به ورزش یا سرگرمی خاصی مشغول هستید؟',
  'آیا تاکنون به حادثه شغلی دچار شده‌اید؟',
  'آیا سابقه غیبت از کار به دلیل بیماری بیش از ۳ روز دارید؟',
  'آیا منزل شما در مجاورت مرکز صنعتی قرار دارد؟',
  'آیا سابقه مرخصی برای کمیسیون پزشکی را دارید؟',
] as const

// ─── بخش ۵: سیستم‌های اندام ───
export interface SystemDef {
  key: SystemKey
  label: string
  symptoms: string[]
  signs: string[]
}

export const ORGAN_SYSTEMS: SystemDef[] = [
  {
    key: 'general',
    label: 'عمومی',
    symptoms: ['کاهش وزن', 'کاهش اشتها', 'خستگی مزمن', 'تعرق بیش از حد', 'اختلال در خواب', 'تب و لرز', 'بدون علامت'],
    signs: ['ظاهر عضوی (toxic/ill)', 'مخاطات پریده رنگ', 'ظاهر غیرطبیعی', 'کبد بزرگ', 'بدون نشانه'],
  },
  {
    key: 'eye',
    label: 'چشم',
    symptoms: ['کاهش حدت دید', 'تاری دید', 'خستگی چشم', 'سوزش چشم', 'خارش چشم', 'ترس از نور', 'اشک ریزش', 'بدون علامت'],
    signs: ['رفلکس مردمک غیرطبیعی', 'فرو رفتگی چشم', 'اسکلر غیرطبیعی', 'نیستاگموس', 'اختلال حرکت چشم', 'قرمزی چشم', 'کدورت عدسی', 'قوز چین', 'بدون نشانه'],
  },
  {
    key: 'ent',
    label: 'گوش، حلق و بینی (ENT)',
    symptoms: ['کاهش شنوایی', 'وزوز گوش', 'سردرد', 'درد گوش', 'ترشح گوش', 'گرفتگی صدا', 'گلودرد', 'آبریزش بینی', 'اختلال بویایی', 'خارش و سوزش بینی', 'خونریزی بینی', 'خشکی دهان', 'احساس مزه فلزی در دهان', 'بدون علامت'],
    signs: ['التهاب پرده تمپان', 'پارگی پرده تمپان', 'افزایش ترشح', 'غیرطبیعی رینوسکوپی', 'التهاب حلق', 'پلیپ بینی', 'Lead Line', 'تلانژکتازی عروقی', 'آلرژی', 'بدون نشانه'],
  },
  {
    key: 'skin',
    label: 'پوست، مو و ناخن',
    symptoms: ['خارش پوست', 'ریزش مو', 'قرمزی پوست', 'تغییر رنگ پوست', 'تغییر ضخامت پوست', 'خشکی پوست', 'بدون علامت'],
    signs: ['ماکول', 'پاپول', 'ندول', 'وزیکول', 'زخم', 'کهیر', 'ریزش موی موضعی', 'ریزش موی منتشر', 'تغییرات پیگمانته', 'آکنه', 'تلانژکتازی', 'اسکلرودرما', 'آریتمی پوستی', 'پسوریازیس', 'اگزما', 'درماتیت', 'ویتیلیگو', 'بدون نشانه'],
  },
  {
    key: 'headNeck',
    label: 'گردن و سر',
    symptoms: ['درد گردن', 'توده گردن', 'بدون علامت'],
    signs: ['لنفادنوپاتی گردن', 'دیستوپی تیروئید', 'بروزگی گردن', 'هیپرتریروئیدیسم', 'بدون نشانه'],
  },
  {
    key: 'lung',
    label: 'ریه',
    symptoms: ['سرفه', 'خلط', 'تنگی نفس', 'خس خس سینه', 'سینه درد', 'بدون علامت'],
    signs: ['صداهای ریوی کاهش‌یافته', 'خس خس', 'خشونت صدا', 'صداهای غیرطبیعی ریوی', 'آسم', 'بدون نشانه'],
  },
  {
    key: 'cardio',
    label: 'قلب و عروق',
    symptoms: ['درد قفسه سینه', 'تپش قلب', 'تنگی نفس', 'تنگی نفس شبانه', 'سیانوز در وضعیت خوابیده', 'سابقه سنکوپ', 'بدون علامت'],
    signs: ['آریتمی قلب', 'صدای قلب غیرطبیعی', 'اضافه صدای قلب', 'واریس اندام فوقانی', 'واریس اندام تحتانی', 'ادم اندام', 'فشار خون', 'بدون نشانه'],
  },
  {
    key: 'abdomen',
    label: 'شکم و لگن',
    symptoms: ['تهوع', 'استفراغ', 'درد شکم', 'سوزش سر دل', 'اسهال', 'یبوست', 'مدفوع قیری', 'خون در مدفوع', 'اختلال در عمل', 'بدون علامت'],
    signs: ['تندرنس شکمی', 'توده شکمی', 'هپاتومگالی', 'اسپلنومگالی', 'آسیت', 'دیستانسیون شکمی', 'هرنی', 'فیستول', 'بدون نشانه'],
  },
  {
    key: 'renal',
    label: 'کلیه و مجاری ادراری',
    symptoms: ['سوزش ادرار', 'تکرر ادرار', 'ادرار خونی', 'درد پهلو', 'احساس سنگینی یا توده در ضلع', 'بدون علامت'],
    signs: ['تندرنس CVA', 'اورولیتیازیس', 'سنگ کلیه', 'نفرومگالی', 'هیدرونفروزیس', 'پروتئینوری', 'بزرگ‌بودن پروستات', 'بدون نشانه'],
  },
  {
    key: 'msk',
    label: 'اسکلتی - عضلانی',
    symptoms: ['خشکی مفصل', 'کمردرد', 'درد زانو', 'درد شانه', 'درد گردن', 'درد سایر مفاصل', 'بدون علامت'],
    signs: ['محدودیت حرکت مفاصل', 'کاهش قدرت عضلانی اندام فوقانی', 'کاهش قدرت عضلانی اندام تحتانی', 'اسکولیوز', 'آمپوتاسیون', 'تست SLR مثبت', 'تست Reverse-SLR مثبت', 'ژنوواروم', 'کرپیتاسیون', 'بدون نشانه'],
  },
  {
    key: 'neuro',
    label: 'سیستم عصبی',
    symptoms: ['درد سر', 'گیجی', 'لرزش', 'اختلال حافظه', 'سابقه صرع/سکته', 'کرختی و مورمور انگشتان دست', 'بدون علامت'],
    signs: ['تست لنت مثبت', 'تست تینل مثبت', 'تست فلن مثبت', 'تست رومبرگ مثبت', 'تست رنو مثبت', 'اختلال حس اندام‌ها', 'آنزوپسوسی', 'میگرن', 'لکنت زبان', 'سندروم تونل کارپ', 'بدون نشانه'],
  },
  {
    key: 'psych',
    label: 'اعصاب و روان',
    symptoms: ['بی‌خوابی بیش از حد', 'پرخاشگری', 'اضطراب', 'کاهش انگیزه', 'بدون علامت'],
    signs: ['هذیان', 'توهم', 'اختلال اوریانتاسیون', 'افسردگی', 'بدون نشانه'],
  },
  { key: 'other', label: 'سایر موارد', symptoms: [], signs: [] },
]

// ─── بخش ۶: فیلدهای آزمایشگاه ───
export interface LabField { key: string; label: string }
export const LAB_GROUPS: { key: string; label: string; fields: LabField[] }[] = [
  {
    key: 'cbc', label: 'CBC (تعداد سلول خون)',
    fields: [
      { key: 'WBC', label: 'WBC' }, { key: 'RBC', label: 'RBC' }, { key: 'HB', label: 'HB' },
      { key: 'HCT', label: 'HCT' }, { key: 'MCV', label: 'MCV' }, { key: 'MCH', label: 'MCH' },
      { key: 'MCHC', label: 'MCHC' }, { key: 'PLT', label: 'PLT' }, { key: 'RDW', label: 'RDW %' },
      { key: 'NeuPct', label: 'Neu %' }, { key: 'LymPct', label: 'Lym %' }, { key: 'MonoPct', label: 'Mono %' },
      { key: 'EosPct', label: 'Eos %' }, { key: 'BasoPct', label: 'Baso %' }, { key: 'MPV', label: 'MPV' },
      { key: 'PDW', label: 'PDW' }, { key: 'PLCR', label: 'P-LCR' }, { key: 'MXD', label: 'MXD' },
    ],
  },
  {
    key: 'blood', label: 'بیوشیمی خون',
    fields: [
      { key: 'FBS', label: 'FBS' }, { key: 'Urea', label: 'Urea' }, { key: 'Cr', label: 'Cr' },
      { key: 'UAcid', label: 'U Acid' }, { key: 'Chol', label: 'Chol' }, { key: 'TG', label: 'TG' },
      { key: 'HDL', label: 'HDL' }, { key: 'LDL', label: 'LDL' }, { key: 'CH_HDL', label: 'CH/HDL' },
      { key: 'LDL_HDL', label: 'LDL/HDL' }, { key: 'Bil', label: 'Bil' }, { key: 'AST', label: 'AST' },
      { key: 'ALT', label: 'ALT' }, { key: 'ALKPH', label: 'AlkPh' }, { key: 'ESR', label: 'ESR' },
      { key: 'CRP', label: 'CRP' }, { key: 'HBA1C', label: 'HbA1C' }, { key: 'BS', label: 'BS' },
      { key: 'TSH', label: 'TSH' }, { key: 'T3', label: 'T3' }, { key: 'T4', label: 'T4' },
      { key: 'VitD3', label: 'Vit D3' }, { key: 'PSA', label: 'PSA' }, { key: 'FreePSA', label: 'Free PSA' },
      { key: 'BUN', label: 'BUN' }, { key: 'HPylori', label: 'HPylori' }, { key: 'SE_OB', label: 'SE&OB' },
    ],
  },
  {
    key: 'urine', label: 'آنالیز ادرار (UA)',
    fields: [
      { key: 'Color', label: 'Color' }, { key: 'APP', label: 'APP' }, { key: 'SG', label: 'SG' },
      { key: 'PH', label: 'PH' }, { key: 'Prot', label: 'Prot' }, { key: 'Glu', label: 'Glu' },
      { key: 'Keton', label: 'Keton' }, { key: 'UBili', label: 'Bili' }, { key: 'UroBili', label: 'UroBili' },
      { key: 'Blood', label: 'Blood' }, { key: 'Yeast', label: 'Yeast' }, { key: 'Nitrit', label: 'Nitrit' },
      { key: 'UAWBC', label: 'WBC' }, { key: 'UARBC', label: 'RBC' }, { key: 'EPI', label: 'EPI' },
      { key: 'Bact', label: 'Bact' }, { key: 'Mucus', label: 'Mucus' }, { key: 'Cast', label: 'Cast' },
      { key: 'Crystal', label: 'Crystal' },
    ],
  },
  {
    key: 'virus', label: 'ویروس‌ها',
    fields: [
      { key: 'HBSAG', label: 'HBS AG' }, { key: 'HBSAB', label: 'HBS AB' }, { key: 'HCVAG', label: 'HCV AG' },
      { key: 'HCVAB', label: 'HCV AB' }, { key: 'HIV', label: 'HIV' },
    ],
  },
  {
    key: 'drug', label: 'تست مواد (Drug Test)',
    fields: [
      { key: 'Tramadol', label: 'Tramadol' }, { key: 'Morphine', label: 'Morphine' }, { key: 'Metadone', label: 'Metadone' },
      { key: 'Marijuana', label: 'Marijuana' }, { key: 'Methamphetamine', label: 'Methamphetamine' }, { key: 'Amphetamine', label: 'Amphetamine' },
      { key: 'Cocaine', label: 'Cocaine' }, { key: 'Benzodiazepines', label: 'Benzodiazepines' }, { key: 'Phencyclidine', label: 'Phencyclidine' },
      { key: 'Buprenorphine', label: 'Buprenorphine' }, { key: 'Ecstasy', label: 'Ecstasy' }, { key: 'Opiates', label: 'Opiates' },
      { key: 'Barbiturates', label: 'Barbiturates' }, { key: 'Oxycodone', label: 'Oxycodone' }, { key: 'Tricyclic', label: 'Tricyclic' },
      { key: 'Propoxyphene', label: 'Propoxyphene' },
    ],
  },
  {
    key: 'other', label: 'سایر',
    fields: [
      { key: 'Calcium', label: 'Calcium' }, { key: 'Phosphorus', label: 'Phosphorus' }, { key: 'Sodium', label: 'Sodium' },
      { key: 'Potassium', label: 'Potassium' }, { key: 'Fe', label: 'Fe' }, { key: 'Zn', label: 'Zn' },
      { key: 'Mg', label: 'Mg' }, { key: 'BloodGroup', label: 'Blood Group' }, { key: 'RH', label: 'RH' },
      { key: 'SIron', label: 'S-Iron' }, { key: 'TIron', label: 'T-Iron' }, { key: 'TIBC', label: 'TIBC' },
      { key: 'Ferritin', label: 'Ferritin' }, { key: 'SE', label: 'SE' }, { key: 'Fit', label: 'Fit' },
      { key: 'Sperm', label: 'Sperm' }, { key: 'PPD', label: 'PPD' },
    ],
  },
]

export const AUDIO_FREQS = ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000'] as const

export const VISION_STATUS_LABELS: Record<string, string> = { NORMAL: 'طبیعی', ABNORMAL: 'غیرطبیعی' }

// مرکز (قابل ویرایش در تنظیمات)
export const DEFAULT_CENTER = {
  orgLine1: 'وزارت بهداشت، درمان و آموزش پزشکی',
  orgLine2: 'مرکز طب کار مهرگان — پرونده پزشکی شاغل',
  orgLine3: 'پرونده پزشکی شاغل',
  address: '',
  phone: '',
}
