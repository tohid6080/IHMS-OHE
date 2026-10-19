// ─── انواع داده مشترک سامانه مدیریت معاینات طب کار ───

export type Role =
  | 'ADMIN'
  | 'MANAGER'
  | 'HSE'
  | 'DOCTOR'
  | 'AUDIOLOGIST'
  | 'OPTOMETRIST'
  | 'LAB'
  | 'EMPLOYER'
  | 'CONTRACTOR'

export type SectionKey = 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7A' | 'S7B' | 'S7C' | 'S7D' | 'S8' | 'S9'

export type SectionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SENT_FOR_REVIEW'
  | 'NEEDS_CORRECTION'
  | 'APPROVED'
  | 'NOT_APPLICABLE'

export type ExamType = 'PRE_EMPLOYMENT' | 'PERIODIC' | 'SPECIFIC'
export type GroupType = 'CONTRACTOR' | 'DIRECT' | 'INDEPENDENT'
export type FinalOpinion = 'FIT' | 'CONDITIONAL' | 'UNFIT' | 'INCOMPLETE'
export type YesNo = 'yes' | 'no' | ''

// ─── کاربر ───
export interface SessionUser {
  id: string
  username: string
  fullName: string
  role: Role
  companyId?: string | null
  contractorId?: string | null
  personId?: string | null
  /** امضا و مهر ثبت‌شده توسط مدیر (dataURL) — فقط در پاسخ me/login پر می‌شود */
  signatureData?: string | null
  stampData?: string | null
  signatureApproved?: boolean
}

// ─── بخش ۲: سوابق شغلی ───
export interface JobHistoryRow {
  position: string
  duties: string
  fromDate?: string
  toDate?: string
  changeReason?: string
}
export interface Section2Data {
  current: JobHistoryRow[]
  previous: JobHistoryRow[]
}

// ─── بخش ۳: عوامل زیان‌آور ───
export interface FactorRow {
  physical: string[]
  chemical: string[]
  biological: string[]
  ergonomic: string[]
  psychological: string[]
}
export interface Section3Data {
  current: FactorRow
  previous: FactorRow
  more: string
  measurements: string
  expertOpinion: string
  expertName: string
  expertDate?: string
  signature?: string
}

// ─── بخش ۴: سابقه شخصی و خانوادگی ───
export interface Section4Item {
  answer: YesNo
  note?: string
}
export interface Section4Data {
  items: Section4Item[] // ۱۶ سؤال به ترتیب Q1..Q16
  declaredAt?: string
  declarationSignature?: string
}

// ─── بخش ۵: معاینات بالینی ───
export type SystemKey =
  | 'general' | 'eye' | 'ent' | 'skin' | 'headNeck' | 'lung'
  | 'cardio' | 'abdomen' | 'renal' | 'msk' | 'neuro' | 'psych' | 'other'
export interface OrganSystem {
  symptoms: string[]
  signs: string[]
  notes?: string
}
export interface Section5Data {
  examDate?: string
  weight?: string
  height?: string
  pulse?: string
  systolic?: string
  diastolic?: string
  bmi?: string
  systems: Partial<Record<SystemKey, OrganSystem>>
}

// ─── بخش ۶: آزمایش‌ها ───
// ردیف آزمایش تخصصی / واکسیناسیون (مطابق فرم رسمی: نوع، نتیجه، تاریخ انجام)
export interface SpecialTestRow {
  type: string
  result: string
  date?: string
}
export interface Section6Data {
  testDate?: string
  values: Record<string, string>
  special?: SpecialTestRow[] // حداکثر ۳ ردیف واکسیناسیون/آزمایش تخصصی
  notes?: string
}

// ─── بخش ۷ الف: اپتومتری ───
export type VisionStatus = 'NORMAL' | 'ABNORMAL' | ''
export interface Section7AData {
  testDate?: string
  acuityRightWith?: string
  acuityRightWithout?: string
  acuityLeftWith?: string
  acuityLeftWithout?: string
  colorRight?: VisionStatus
  colorLeft?: VisionStatus
  fieldRight?: VisionStatus
  fieldLeft?: VisionStatus
  nightRight?: VisionStatus
  nightLeft?: VisionStatus
  depthVision?: string // دید عمق (ثانیه آرک)
  notes?: string
  technicianName?: string
  signature?: string
}

// ─── بخش ۷ ب: ادیومتری ───
export type Freq = '250' | '500' | '1000' | '2000' | '3000' | '4000' | '6000' | '8000'
export interface AudioRow {
  ac: Record<Freq, string>
  bc: Record<Freq, string>
}
export interface Section7BData {
  testDate?: string
  right: AudioRow
  left: AudioRow
  srtRight?: string
  sdsRight?: string
  srtLeft?: string
  sdsLeft?: string
  interpretationRight?: string
  interpretationLeft?: string
  tympanicRight?: string
  tympanicLeft?: string
  canalEar?: string
  earDisease?: string
  tinnitus?: string
  noiseHistory?: string
  earTrauma?: string
  dizziness?: string
  moreNotes?: string
  audiologistName?: string
  signature?: string
}

// ─── بخش ۷ ج: اسپیرومتری ───
export interface Section7CData {
  testDate?: string
  fev1Value?: string
  fev1Percent?: string
  fvcValue?: string
  fvcPercent?: string
  fev1Fvc?: string
  fef?: string
  pef?: string
  vext?: string
  interpretation?: string
  technicianName?: string
  signature?: string
}

// ─── بخش ۷ د: سایر پاراکلینیک ───
export interface Section7DData {
  cxr?: string
  cxrDate?: string
  ecg?: string
  ecgDate?: string
  others?: string
  notes?: string
  technicianName?: string
}

// ─── بخش ۸: ارجاع‌ها ───
export interface Referral {
  id: string
  date?: string
  reason: string
  specialty: string
  result?: string
  resolved: boolean
}
export interface Section8Data {
  referrals: Referral[]
  note?: string
}

// ─── بخش‌های ذخیره‌شده در DB ───
export interface SectionDTO {
  id: string
  caseId: string
  key: SectionKey
  status: SectionStatus
  data: Record<string, unknown>
  updatedByName?: string | null
  submittedAt?: string | null
  approvedByName?: string | null
  approvedAt?: string | null
  approvedSignature?: string | null
  approvedStamp?: string | null
  naReason?: string | null
  correctionNote?: string | null
  updatedAt: string
}

export interface PersonDTO {
  id: string
  nationalId: string
  firstName: string
  lastName: string
  fatherName?: string | null
  gender: string
  birthYear?: string | null
  birthDate?: string | null
  maritalStatus?: string | null
  childrenCount?: number | null
  education?: string | null
  phone?: string | null
  insuranceNo?: string | null
  militaryStatus?: string | null
  militaryUnit?: string | null
  militaryExemption?: string | null
  photo?: string | null
}

export interface CaseListItem {
  id: string
  caseNumber: string
  examType: string
  visitDate: string
  workPlace: string
  jobTitle: string
  groupType: string
  finalOpinion?: string | null
  completedAt?: string | null
  person: { id: string; firstName: string; lastName: string; nationalId: string; photo?: string | null }
  company?: { id: string; name: string } | null
  contractor?: { id: string; name: string } | null
  project?: { id: string; name: string } | null
  progress: number // 0..100
  openCount: number
  sections: { key: string; status: string }[]
}

export interface HistoryDTO {
  id: string
  userName: string
  action: string
  sectionKey?: string | null
  detail?: string | null
  createdAt: string
}

export interface CaseDetailDTO {
  case: {
    id: string
    caseNumber: string
    examType: string
    visitDate: string
    workPlace: string
    jobTitle: string
    workUnit?: string | null
    groupType: string
    finalOpinion?: string | null
    finalText?: string | null
    finalCondition?: string | null
    finalReason?: string | null
    finalAdvice?: string | null
    finalDoctorName?: string | null
    finalDoctorCode?: string | null
    finalDate?: string | null
    finalSignature?: string | null
    finalStamp?: string | null
    workerDeclaration?: string | null
    workerDeclarationName?: string | null
    completedAt?: string | null
    createdByName: string
    createdAt: string
    person: PersonDTO
    company?: { id: string; name: string } | null
    contractor?: { id: string; name: string } | null
    project?: { id: string; name: string } | null
  }
  sections: SectionDTO[]
  history: HistoryDTO[]
  openItems: OpenItem[]
  canFinalize: { ok: boolean; blockers: string[] }
  progress: number
  restricted: boolean // کارفرما/پیمانکار: داده پزشکی تفصیلی مخفی
}

export interface OpenItem {
  key: string // section key or 'REFERRAL'
  label: string
  responsibleRole: Role
  responsibleLabel: string
}
