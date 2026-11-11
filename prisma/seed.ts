// سید داده اولیه سامانه — اجرا: bun prisma/seed.ts  (یا: npx tsx prisma/seed.ts)
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { randomBytes } from 'crypto'
import path from 'path'

const db = new PrismaClient()

// رمزها هرگز در کد/مخزن قرار نمی‌گیرند:
// ۱) اگر فایل db/demo-credentials.json وجود داشته باشد از آن خوانده می‌شود
// ۲) وگرنه رمزهای تصادفی ساخته و در همان فایل ذخیره می‌شوند (فایل در gitignore است)
const credFile = path.resolve(process.cwd(), 'db', 'demo-credentials.json')
const SEED_USERS = ['admin', 'manager', 'hse', 'doctor', 'audio', 'opto', 'lab', 'employer', 'contractor1', 'contractor2']

function loadPasswords(): Record<string, string> {
  if (existsSync(credFile)) {
    return JSON.parse(readFileSync(credFile, 'utf8')) as Record<string, string>
  }
  const passwords: Record<string, string> = {}
  for (const u of SEED_USERS) passwords[u] = randomBytes(6).toString('hex')
  mkdirSync(path.dirname(credFile), { recursive: true })
  writeFileSync(credFile, JSON.stringify(passwords, null, 2), 'utf8')
  console.log('🔐 رمزهای تصادفی ساخته شد و در db/demo-credentials.json ذخیره شد (این فایل در مخزن قرار نمی‌گیرد)')
  return passwords
}

const passwords = loadPasswords()

async function main() {
  console.log('⏳ پاک‌سازی داده‌های قبلی...')
  await db.caseHistory.deleteMany()
  await db.caseSection.deleteMany()
  await db.case.deleteMany()
  await db.user.deleteMany()
  await db.person.deleteMany()
  await db.project.deleteMany()
  await db.contractor.deleteMany()
  await db.company.deleteMany()

  console.log('⏳ ایجاد شرکت‌ها...')
  const company = await db.company.create({ data: { name: 'شرکت نیرنگوتراکم', nationalId: '10101234567', phone: '071-37220000', address: 'شیراز، زرباط' } })
  const contractor1 = await db.contractor.create({ data: { name: 'شرکت نیروتوان‌ساختمان', companyId: company.id, phone: '071-37221111' } })
  const contractor2 = await db.contractor.create({ data: { name: 'شرکت بهسازان عصر جدید', companyId: company.id, phone: '071-37222222' } })
  const project1 = await db.project.create({ data: { name: 'پروژه نصب نیروتوان ۱', companyId: company.id, contractorId: contractor1.id } })

  console.log('⏳ ایجاد کاربران...')
  const pw = async (p: string) => bcrypt.hashSync(p, 10)
  await db.user.createMany({
    data: [
      { username: 'admin', password: await pw(passwords['admin']), fullName: 'مدیر سامانه', role: 'ADMIN' },
      { username: 'manager', password: await pw(passwords['manager']), fullName: 'مریم مدیری', role: 'MANAGER' },
      { username: 'hse', password: await pw(passwords['hse']), fullName: 'اسماء تختی‌زاده', role: 'HSE' },
      { username: 'doctor', password: await pw(passwords['doctor']), fullName: 'دکتر احمد زیدآبادی نژاد', role: 'DOCTOR' },
      { username: 'audio', password: await pw(passwords['audio']), fullName: 'طیبه ایمانی', role: 'AUDIOLOGIST' },
      { username: 'opto', password: await pw(passwords['opto']), fullName: 'رضا اپتومتریست', role: 'OPTOMETRIST' },
      { username: 'lab', password: await pw(passwords['lab']), fullName: 'کاربر آزمایشگاه', role: 'LAB' },
      { username: 'employer', password: await pw(passwords['employer']), fullName: 'نماینده شرکت نیرنگوتراکم', role: 'EMPLOYER', companyId: company.id },
      { username: 'contractor1', password: await pw(passwords['contractor1']), fullName: 'نماینده نیروتوان‌ساختمان', role: 'CONTRACTOR', contractorId: contractor1.id },
      { username: 'contractor2', password: await pw(passwords['contractor2']), fullName: 'نماینده بهسازان عصر جدید', role: 'CONTRACTOR', contractorId: contractor2.id },
    ],
  })

  console.log('⏳ ایجاد افراد...')
  const person1 = await db.person.create({
    data: {
      nationalId: '2452142468', firstName: 'سجاد', lastName: 'حبشی انگدر', fatherName: 'کرامت',
      gender: 'MALE', birthYear: '1366', maritalStatus: 'MARRIED', childrenCount: 1,
      education: 'کارشناسی', phone: '09171909127', insuranceNo: '2452142468',
      militaryStatus: 'DONE', militaryUnit: 'سپاه',
    },
  })
  const person2 = await db.person.create({
    data: {
      nationalId: '1389878723', firstName: 'علی', lastName: 'حسنی', fatherName: 'گلعلی',
      gender: 'MALE', birthYear: '1372', maritalStatus: 'SINGLE', childrenCount: 0,
      education: 'دیپلم', phone: '09173111111', militaryStatus: 'DONE', militaryUnit: 'ارتش',
    },
  })
  const person3 = await db.person.create({
    data: {
      nationalId: '4541989960', firstName: 'علی', lastName: 'ابراهیم‌پور', fatherName: 'حامد',
      gender: 'MALE', birthYear: '1380', maritalStatus: 'SINGLE', childrenCount: 0,
      education: 'دیپلم', phone: '09173222222', militaryStatus: 'PENDING',
    },
  })
  const person4 = await db.person.create({
    data: {
      nationalId: '4541112233', firstName: 'سکینه', lastName: 'احمدی', fatherName: 'محمد',
      gender: 'FEMALE', birthYear: '1375', maritalStatus: 'MARRIED', childrenCount: 2,
      education: 'کاردانی', phone: '09173333333',
    },
  })

  console.log('⏳ ایجاد پرونده نمونه (تکمیل‌شده مطابق فرم پیوست)...')
  const emptyFreq = () => ({ '250': '', '500': '', '1000': '', '2000': '', '3000': '', '4000': '', '6000': '', '8000': '' })
  const freqRow = (v: string) => ({ ...emptyFreq(), ...Object.fromEntries(Object.keys(emptyFreq()).map((k) => [k, v])) }) as Record<string, string>

  const noItems = (extra: Record<number, string> = {}) =>
    Array.from({ length: 16 }, (_, i) => ({ answer: extra[i] ? 'yes' : 'no', note: extra[i] || '' }))

  const s5Systems = () => {
    const systems: Record<string, { symptoms: string[]; signs: string[]; notes: string }> = {}
    const map: Record<string, [string[], string[]]> = {
      general: [['بدون علامت'], ['بدون نشانه']],
      eye: [['بدون علامت'], ['بدون نشانه']],
      ent: [['بدون علامت'], ['بدون نشانه']],
      skin: [['بدون علامت'], ['بدون نشانه']],
      headNeck: [['بدون علامت'], ['بدون نشانه']],
      lung: [['بدون علامت'], ['بدون نشانه']],
      cardio: [['بدون علامت'], ['بدون نشانه']],
      abdomen: [['بدون علامت'], ['بدون نشانه']],
      renal: [['بدون علامت'], ['بدون نشانه']],
      msk: [['بدون علامت'], ['بدون نشانه']],
      neuro: [['بدون علامت'], ['بدون نشانه']],
      psych: [['بدون علامت'], ['بدون نشانه']],
    }
    for (const [k, [sy, si]] of Object.entries(map)) systems[k] = { symptoms: sy, signs: si, notes: '' }
    return systems
  }

  const case1 = await db.case.create({
    data: {
      caseNumber: '1405-0001',
      personId: person1.id,
      examType: 'PRE_EMPLOYMENT',
      visitDate: '1405/07/06',
      workPlace: 'نصب نیروتوان ۱ ساختمان',
      jobTitle: 'مسئول منابع انسانی',
      workUnit: 'اداره منابع انسانی',
      companyId: company.id,
      groupType: 'DIRECT',
      finalOpinion: 'FIT',
      finalText: 'اشتغال به کار بلامانع است',
      finalDoctorName: 'دکتر احمد زیدآبادی نژاد',
      finalDoctorCode: '27247',
      finalDate: '1405/07/09',
      createdBy: 'manager',
      createdByName: 'مریم مدیری',
      completedAt: new Date(),
      sections: {
        create: [
          {
            key: 'S2', status: 'APPROVED', updatedByName: 'مریم مدیری', approvedByName: 'مریم مدیری', approvedAt: new Date(),
            data: JSON.stringify({
              current: [{ position: 'مسئول منابع انسانی', duties: 'جذب نیرو، رفاهیات، امور بیمه و موارد دیگر', fromDate: '1403/06/01', toDate: 'اکنون', changeReason: '' }],
              previous: [{ position: 'مسئول منابع انسانی', duties: 'جذب نیرو، رفاهیات، امور بیمه و موارد دیگر', fromDate: '', toDate: '5 سال', changeReason: '' }],
            }),
          },
          {
            key: 'S3', status: 'APPROVED', updatedByName: 'اسماء تختی‌زاده', approvedByName: 'اسماء تختی‌زاده', approvedAt: new Date(),
            data: JSON.stringify({
              current: { physical: ['ارتعاش'], chemical: ['گرد و غبار'], biological: [], ergonomic: ['ایستادن یا نشستن طولانی مدت', 'حمل و نقل بار سنگین', 'وضعیت بدنی نامناسب'], psychological: ['استرسورهای شغلی'] },
              previous: { physical: ['ارتعاش'], chemical: ['گرد و غبار'], biological: [], ergonomic: ['ایستادن یا نشستن طولانی مدت', 'وضعیت بدنی نامناسب'], psychological: ['استرسورهای شغلی'] },
              more: '',
              measurements: 'نتایج اندازه‌گیری عوامل زیان‌آور با توجه به نزدیک‌ترین گروه شغلی: مواجهه با نویز در حد کمتر از حد مجاز گزارش شده است.',
              expertOpinion: 'رعایت اصول ارگونومی (به ازای ۹۰ دقیقه کار، ۱۵ دقیقه استراحت، حرکات کششی انجام دهید)، عدم خیرگی طولانی مدت؛ پس از ۲۰ دقیقه کار با کامپیوتر ۲۰ ثانیه به حالت خیره به فاصله ۶ متری نگاه شود، استفاده از زیرپایی و صندلی ارگونومیک، مانیتور، رعایت اصول ارگونومی توصیه می‌شود.',
              expertName: 'اسماء تختی‌زاده',
              expertDate: '1405/07/06',
            }),
          },
          {
            key: 'S4', status: 'APPROVED', updatedByName: 'دکتر احمد زیدآبادی نژاد', approvedByName: 'دکتر احمد زیدآبادی نژاد', approvedAt: new Date(),
            data: JSON.stringify({
              items: noItems({ 9: 'نیم‌نخ به مدت ۵ سال', 11: 'ورزش پیاده‌روی' }),
              declaredAt: '1405/07/06',
            }),
          },
          {
            key: 'S5', status: 'APPROVED', updatedByName: 'دکتر احمد زیدآبادی نژاد', approvedByName: 'دکتر احمد زیدآبادی نژاد', approvedAt: new Date(),
            data: JSON.stringify({
              examDate: '1405/07/06', weight: '68', height: '172', pulse: '82', systolic: '120', diastolic: '75', bmi: '22.99',
              systems: s5Systems(),
            }),
          },
          {
            key: 'S6', status: 'APPROVED', updatedByName: 'کاربر آزمایشگاه', approvedByName: 'دکتر احمد زیدآبادی نژاد', approvedAt: new Date(),
            data: JSON.stringify({
              testDate: '1405/07/06',
              values: { WBC: '9.1', RBC: '4.92', HB: '14.5', HCT: '43.2', MCV: '87.8', MCH: '29.5', PLT: '263', FBS: '100', Chol: '171', TG: '156', Cr: '0.89' },
              notes: '',
            }),
          },
          {
            key: 'S7A', status: 'APPROVED', updatedByName: 'رضا اپتومتریست', approvedByName: 'دکتر احمد زیدآبادی نژاد', approvedAt: new Date(),
            data: JSON.stringify({
              testDate: '1405/07/06',
              acuityRightWith: '10/10', acuityRightWithout: '10/10', acuityLeftWith: '10/10', acuityLeftWithout: '10/10',
              colorRight: 'NORMAL', colorLeft: 'NORMAL', fieldRight: 'NORMAL', fieldLeft: 'NORMAL',
              nightRight: 'NORMAL', nightLeft: 'NORMAL',
              notes: '', technicianName: 'رضا اپتومتریست',
            }),
          },
          {
            key: 'S7B', status: 'APPROVED', updatedByName: 'طیبه ایمانی', approvedByName: 'طیبه ایمانی', approvedAt: new Date(),
            data: JSON.stringify({
              testDate: '1405/07/06',
              right: { ac: freqRow('10'), bc: freqRow('') },
              left: { ac: freqRow('10'), bc: freqRow('') },
              srtRight: '', sdsRight: '', srtLeft: '', sdsLeft: '',
              interpretationRight: 'Normal', interpretationLeft: 'Normal',
              tympanicRight: 'طبیعی', tympanicLeft: 'طبیعی',
              canalEar: 'طبیعی', earDisease: 'منفی', tinnitus: 'منفی', noiseHistory: 'دارد', earTrauma: 'منفی', dizziness: 'منفی',
              moreNotes: '', audiologistName: 'طیبه ایمانی',
            }),
          },
          {
            key: 'S7C', status: 'APPROVED', updatedByName: 'کاربر آزمایشگاه', approvedByName: 'دکتر احمد زیدآبادی نژاد', approvedAt: new Date(),
            data: JSON.stringify({
              testDate: '1405/07/06', fev1Value: '4.30', fev1Percent: '114', fvcValue: '5.07', fvcPercent: '111',
              fev1Fvc: '84.8', fef: '4.65', pef: '10.22', vext: '125', interpretation: 'Normal', technicianName: 'کاربر آزمایشگاه',
            }),
          },
          {
            key: 'S7D', status: 'NOT_APPLICABLE', updatedByName: 'دکتر احمد زیدآبادی نژاد', approvedByName: 'دکتر احمد زیدآبادی نژاد', approvedAt: new Date(),
            naReason: 'بر اساس تشخیص پزشک برای این معاینه لازم نبود',
            data: JSON.stringify({ cxr: '', ecg: '', others: '', notes: '' }),
          },
          {
            key: 'S8', status: 'APPROVED', updatedByName: 'دکتر احمد زیدآبادی نژاد', approvedByName: 'دکتر احمد زیدآبادی نژاد', approvedAt: new Date(),
            data: JSON.stringify({ referrals: [], note: 'نیاز به ارجاع نبود' }),
          },
          {
            key: 'S9', status: 'APPROVED', updatedByName: 'دکتر احمد زیدآبادی نژاد', approvedByName: 'دکتر احمد زیدآبادی نژاد', approvedAt: new Date(),
            data: JSON.stringify({}),
          },
        ],
      },
      history: {
        create: [
          { userId: 'seed', userName: 'مریم مدیری', action: 'تشکیل پرونده (پذیرش)', createdAt: new Date('2026-09-28T08:00:00Z') },
          { userId: 'seed', userName: 'دکتر احمد زیدآبادی نژاد', action: 'ثبت نظریه نهایی: بلامانع', sectionKey: 'S9', createdAt: new Date('2026-10-01T10:00:00Z') },
        ],
      },
    },
  })

  console.log('⏳ ایجاد پرونده در جریان (پیمانکار ۱)...')
  const case2 = await db.case.create({
    data: {
      caseNumber: '1405-0002',
      personId: person2.id,
      examType: 'PERIODIC',
      visitDate: '1405/07/10',
      workPlace: 'پروژه نصب نیروتوان ۱',
      jobTitle: 'تکنسین مونتاژ',
      workUnit: 'واحد اجرا',
      companyId: company.id,
      contractorId: contractor1.id,
      projectId: project1.id,
      groupType: 'CONTRACTOR',
      createdBy: 'manager',
      createdByName: 'مریم مدیری',
      sections: {
        create: [
          {
            key: 'S2', status: 'APPROVED', updatedByName: 'مریم مدیری', approvedByName: 'مریم مدیری', approvedAt: new Date(),
            data: JSON.stringify({
              current: [{ position: 'تکنسین مونتاژ', duties: 'نصب تجهیزات صنعتی', fromDate: '1404/01/15', toDate: 'اکنون', changeReason: '' }],
              previous: [],
            }),
          },
          {
            key: 'S3', status: 'SENT_FOR_REVIEW', updatedByName: 'اسماء تختی‌زاده',
            data: JSON.stringify({
              current: { physical: ['سر و صدا', 'ارتعاش'], chemical: ['گرد و غبار', 'دمه فلزات'], biological: [], ergonomic: ['حمل و نقل بار سنگین', 'وضعیت بدنی نامناسب'], psychological: ['نوبت کاری'] },
              previous: { physical: [], chemical: [], biological: [], ergonomic: [], psychological: [] },
              more: '', measurements: '', expertOpinion: '', expertName: 'اسماء تختی‌زاده',
            }),
          },
        ],
      },
      history: { create: [{ userId: 'seed', userName: 'مریم مدیری', action: 'تشکیل پرونده (پذیرش)' }] },
    },
  })

  console.log('⏳ ایجاد پرونده تازه پذیرش‌شده (پیمانکار ۲)...')
  await db.case.create({
    data: {
      caseNumber: '1405-0003',
      personId: person3.id,
      examType: 'PRE_EMPLOYMENT',
      visitDate: '1405/07/12',
      workPlace: 'پروژه بهسازان',
      jobTitle: 'اپراتور تجهیزات',
      workUnit: 'بهره‌برداری',
      companyId: company.id,
      contractorId: contractor2.id,
      groupType: 'CONTRACTOR',
      createdBy: 'manager',
      createdByName: 'مریم مدیری',
      sections: { create: [{ key: 'S2', status: 'NOT_STARTED', data: '{}' }] },
      history: { create: [{ userId: 'seed', userName: 'مریم مدیری', action: 'تشکیل پرونده (پذیرش)' }] },
    },
  })

  console.log('⏳ ایجاد پرونده فرد مستقل...')
  await db.case.create({
    data: {
      caseNumber: '1405-0004',
      personId: person4.id,
      examType: 'SPECIFIC',
      visitDate: '1405/07/13',
      workPlace: 'کارگاه آزاد خیاطی',
      jobTitle: 'خیاط صنعتی',
      groupType: 'INDEPENDENT',
      createdBy: 'manager',
      createdByName: 'مریم مدیری',
      sections: {
        create: [
          {
            key: 'S2', status: 'APPROVED', updatedByName: 'مریم مدیری', approvedByName: 'مریم مدیری', approvedAt: new Date(),
            data: JSON.stringify({
              current: [{ position: 'خیاط صنعتی', duties: 'دوخت صنعتی', fromDate: '1402/03/01', toDate: 'اکنون', changeReason: '' }],
              previous: [],
            }),
          },
          { key: 'S3', status: 'IN_PROGRESS', updatedByName: 'اسماء تختی‌زاده', data: JSON.stringify({ current: { physical: [], chemical: [], biological: [], ergonomic: ['نشستن طولانی مدت'], psychological: [] }, previous: { physical: [], chemical: [], biological: [], ergonomic: [], psychological: [] }, more: '', measurements: '', expertOpinion: '', expertName: '' }) },
          { key: 'S6', status: 'IN_PROGRESS', updatedByName: 'کاربر آزمایشگاه', data: JSON.stringify({ testDate: '1405/07/13', values: { WBC: '7.2', RBC: '4.5', HB: '13.1' }, notes: 'سایر آزمایش‌ها در انتظار' }) },
        ],
      },
      history: { create: [{ userId: 'seed', userName: 'مریم مدیری', action: 'تشکیل پرونده (پذیرش)' }] },
    },
  })

  console.log('✅ سید کامل شد. پرونده نمونه:', case1.caseNumber, 'و', case2.caseNumber)
}

main()
  .catch((e) => {
    console.error('❌ خطای سید:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
