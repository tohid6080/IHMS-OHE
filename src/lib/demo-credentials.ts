// ⚠️ فایل موقت — فقط برای دوره راه‌اندازی و آزمایش سامانه
// این فایل بعداً باید به‌همراه بخش نمایش حساب‌ها در صفحه ورود حذف شود.
// (جستجوی «DEMO-CREDENTIALS» تمام نقاطی که باید پاک شوند را نشان می‌دهد)

export interface DemoAccount {
  username: string
  password: string
  roleLabel: string
  fullName: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'admin', password: 'Mehregan-c1ffb965', roleLabel: 'مدیر سامانه', fullName: 'مدیر سامانه' },
  { username: 'manager', password: 'Mehregan-13c606e3', roleLabel: 'مدیر', fullName: 'مریم مدیری' },
  { username: 'hse', password: 'Mehregan-b54496d8', roleLabel: 'بهداشت حرفه‌ای', fullName: 'اسماء تختی‌زاده' },
  { username: 'doctor', password: 'Mehregan-a63541d0', roleLabel: 'پزشک', fullName: 'دکتر احمد زیدآبادی نژاد' },
  { username: 'audio', password: 'Mehregan-a45ea74b', roleLabel: 'شنوایی‌سنج', fullName: 'طیبه ایمانی' },
  { username: 'opto', password: 'Mehregan-e894940d', roleLabel: 'بینایی‌سنج', fullName: 'رضا اپتومتریست' },
  { username: 'lab', password: 'Mehregan-42a4df80', roleLabel: 'آزمایشگاه', fullName: 'کاربر آزمایشگاه' },
  { username: 'employer', password: 'Mehregan-06d69328', roleLabel: 'کارفرما', fullName: 'نماینده شرکت نیرنگوتراکم' },
  { username: 'contractor1', password: 'Mehregan-db885f82', roleLabel: 'پیمانکار ۱', fullName: 'نماینده نیروتوان‌ساختمان' },
  { username: 'contractor2', password: 'Mehregan-2a9e0234', roleLabel: 'پیمانکار ۲', fullName: 'نماینده بهسازان عصر جدید' },
]
