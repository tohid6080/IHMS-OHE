// Generate a Persian RTL Word document with all system usernames & passwords
// Usage: node scripts/generate-credentials-docx.js
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, AlignmentType, WidthType, BorderStyle,
  ShadingType, VerticalAlign,
} = require('docx')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const creds = JSON.parse(fs.readFileSync(path.join(root, 'db', 'demo-credentials.json'), 'utf8'))

// Order and metadata (must match prisma/seed.ts)
const ACCOUNTS = [
  { username: 'admin', roleLabel: 'مدیر سامانه', fullName: 'مدیر سامانه' },
  { username: 'manager', roleLabel: 'مدیر', fullName: 'مریم مدیری' },
  { username: 'hse', roleLabel: 'بهداشت حرفه‌ای', fullName: 'اسماء تختی‌زاده' },
  { username: 'doctor', roleLabel: 'پزشک', fullName: 'دکتر احمد زیدآبادی نژاد' },
  { username: 'audio', roleLabel: 'شنوایی‌سنج', fullName: 'طیبه ایمانی' },
  { username: 'opto', roleLabel: 'بینایی‌سنج', fullName: 'رضا اپتومتریست' },
  { username: 'lab', roleLabel: 'آزمایشگاه', fullName: 'کاربر آزمایشگاه' },
  { username: 'employer', roleLabel: 'کارفرما', fullName: 'نماینده شرکت نیرنگوتراکم' },
  { username: 'contractor1', roleLabel: 'پیمانکار ۱', fullName: 'نماینده نیروتوان‌ساختمان' },
  { username: 'contractor2', roleLabel: 'پیمانکار ۲', fullName: 'نماینده بهسازان عصر جدید' },
]

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
const faNum = (n) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)])

// Colors (teal theme, consistent with the app)
const C = {
  primary: '0F766E', // teal-700
  body: '1E293B',
  secondary: '475569',
  headerFill: '0F766E',
  zebra: 'F8FAFC',
  lightTeal: 'F0FDFA',
  warnFill: 'FEF3C7',
  warnBorder: 'D97706',
}

const FONT = { ascii: 'Tahoma', hAnsi: 'Tahoma', cs: 'Tahoma', eastAsia: 'Tahoma' }
const MONO = { ascii: 'Consolas', hAnsi: 'Consolas', cs: 'Tahoma', eastAsia: 'Consolas' }

// Persian run (RTL)
function fa(text, opts = {}) {
  return new TextRun({ text, rightToLeft: true, font: FONT, size: 24, color: C.body, ...opts })
}
// Latin run (LTR — usernames/passwords)
function en(text, opts = {}) {
  return new TextRun({ text, font: MONO, size: 22, color: C.body, ...opts })
}
// RTL paragraph (default start = right side)
function rtlPara(children, opts = {}) {
  return new Paragraph({ bidirectional: true, spacing: { line: 312, ...(opts.spacing || {}) }, children, ...opts })
}

function cellPara(children, align = AlignmentType.CENTER) {
  return new Paragraph({ bidirectional: true, alignment: align, spacing: { line: 276 }, children })
}

const CELL_MARGIN = { top: 80, bottom: 80, left: 120, right: 120 }

function headerCell(text, widthPct) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: CELL_MARGIN,
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: C.headerFill },
    children: [cellPara([fa(text, { bold: true, color: 'FFFFFF', size: 22 })])],
  })
}

function bodyCell(runs, widthPct, fill) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: CELL_MARGIN,
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill },
    children: [cellPara(runs)],
  })
}

// ── Credentials table (visuallyRightToLeft: first array column shows rightmost)
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: C.primary },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: C.primary },
  left: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
  right: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
  insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
}

const credRowsFixed = [
  new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      headerCell('ردیف', 8),
      headerCell('نقش', 18),
      headerCell('نام و نام خانوادگی', 28),
      headerCell('نام کاربری', 20),
      headerCell('رمز عبور', 26),
    ],
  }),
  ...ACCOUNTS.map((acc, i) => {
    const fill = i % 2 === 0 ? 'FFFFFF' : C.zebra
    return new TableRow({
      cantSplit: true,
      children: [
        bodyCell([fa(faNum(i + 1), { size: 20 })], 8, fill),
        bodyCell([fa(acc.roleLabel, { bold: true, size: 20 })], 18, fill),
        bodyCell([fa(acc.fullName, { size: 20 })], 28, fill),
        bodyCell([en(acc.username, { size: 20 })], 20, fill),
        bodyCell([en(creds[acc.username], { size: 20 })], 26, fill),
      ],
    })
  }),
]

// ── Simple info rows for the guide section
function bulletItem(text, boldPrefix) {
  return rtlPara(
    [
      fa('•  ', { bold: true, color: C.primary }),
      ...(boldPrefix ? [fa(boldPrefix, { bold: true })] : []),
      fa(text),
    ],
    { spacing: { line: 312, after: 80 } }
  )
}

function sectionHeading(text) {
  return rtlPara([fa(text, { bold: true, size: 26, color: C.primary })], {
    spacing: { before: 320, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.primary, space: 4 } },
  })
}

// Persian date via Intl (fallback hard-coded)
function persianToday() {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  } catch {
    return '۱۴۰۵/۰۸/۲۰'
  }
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 24, color: C.body },
        paragraph: { spacing: { line: 312 } },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              bidirectional: true,
              alignment: AlignmentType.CENTER,
              children: [fa('سامانه مدیریت معاینات طب کار', { size: 18, color: '94A3B8' })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '94A3B8', font: FONT })],
            }),
          ],
        }),
      },
      children: [
        // ── Title block
        rtlPara([fa('نام‌های کاربری و رمزهای عبور سامانه', { bold: true, size: 40, color: C.primary })], {
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 80 },
        }),
        rtlPara([fa('سامانه مدیریت معاینات طب کار — مرکز طب کار مهرگان', { size: 24, color: C.secondary })], {
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }),
        rtlPara([fa(`تاریخ تنظیم: ${persianToday()}`, { size: 20, color: C.secondary })], {
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
        }),

        // ── Confidentiality warning
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          visuallyRightToLeft: true,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: C.warnBorder },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: C.warnBorder },
            left: { style: BorderStyle.SINGLE, size: 6, color: C.warnBorder },
            right: { style: BorderStyle.SINGLE, size: 6, color: C.warnBorder },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  margins: { top: 120, bottom: 120, left: 160, right: 160 },
                  shading: { type: ShadingType.CLEAR, fill: C.warnFill },
                  children: [
                    rtlPara([fa('هشدار محرمانگی', { bold: true, size: 22, color: '92400E' })], { spacing: { after: 60 } }),
                    rtlPara(
                      [fa('این سند حاوی رمزهای عبور سامانه است و فقط برای دوره راه‌اندازی تنظیم شده است. از ارسال آن در کانال‌های عمومی خودداری کنید و پس از توزیع رمزها میان کاربران، این فایل را حذف کنید.', { size: 20, color: '92400E' })],
                      { spacing: { line: 300 } }
                    ),
                  ],
                }),
              ],
            }),
          ],
        }),

        // ── Credentials table
        rtlPara([fa('جدول حساب‌های کاربری', { bold: true, size: 26, color: C.primary })], {
          keepNext: true,
          spacing: { before: 320, after: 140 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          visuallyRightToLeft: true,
          borders: tableBorders,
          rows: credRowsFixed,
        }),

        // ── Login guide
        sectionHeading('راهنمای ورود به سامانه'),
        bulletItem('نشانی سامانه را در مرورگر باز کنید و در صفحه ورود، نام کاربری و رمز عبور را مطابق جدول بالا وارد کنید.'),
        bulletItem('به بزرگی و کوچکی حروف، خط تیره ( - ) و عدم وجود فاصله اضافی در ابتدا و انتهای رمز دقت کنید؛ مثال: ', 'دقت در تایپ:'),
        rtlPara([en('Mehregan-c1ffb965', { size: 20, color: C.primary, bold: true })], {
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),
        bulletItem('در صورت فراموشی رمز، از مدیر سامانه درخواست تغییر رمز کنید؛ سامانه رمز را بازیابی نمی‌کند بلکه آن را بازتنظیم می‌کند.'),

        // ── Troubleshooting notes
        sectionHeading('نکات مهم و عیب‌یابی'),
        bulletItem('رمزهای عبور به بزرگی و کوچکی حروف حساس هستند (حرف M در ابتدای Mehregan بزرگ است).'),
        bulletItem('این رمزها مربوط به پایگاه‌داده فعلی سامانه است. اگر روی نسخه دیگری از برنامه (مثلاً روی رایانه دیگری) ورود انجام نشد، پایگاه‌داده آن نسخه با این فایل هم‌زمان نیست و رمزهای آن متفاوت است؛ در این حالت فقط پایگاه‌داده همان نسخه ملاک است.'),
        bulletItem('اگر پیام «نام کاربری یا رمز عبور اشتباه است» دیدید، ابتدا نام کاربری را با جدول تطبیق دهید (مثلاً contractor1 نه contractor01)، سپس رمز را دقیق و بدون فاصله اضافی وارد کنید.'),
        bulletItem('توصیه امنیتی: پس از راه‌اندازی و توزیع حساب‌ها، از طریق بخش مدیریت کاربران رمز هر کاربر را تغییر دهید و این فایل را پاک کنید.'),
      ],
    },
  ],
})

const outDir = path.join(root, 'download')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'کاربران-و-رمزهای-عبور-سامانه.docx')

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf)
  console.log('saved:', outPath, buf.length, 'bytes')
})
