# Task 3-c — Agent: zai-code

Task: دید نقشی بخش‌ها + امضای تک‌کلیکی + مهر نظریه نهایی + «کارهای من»

## Work Log
- SectionActions.tsx: `hasAutoSignature = !!user?.signatureApproved && !!user?.signatureData` → جایگزینی دکمه/پنل تأیید با دکمه واحد «ثبت امضا و مهر» (زمردی، CheckCircle2/Loader2) که مستقیم `run('approve', { action:'approve', name: user.fullName, signature: user.signatureData, stamp: user.stampData||'', ...extraApprovePayload })` می‌فرستد؛ پیش‌نمایش امضا h-8 و مهر h-10 کنار دکمه + متن «امضای تأییدشده شما به‌طور خودکار درج می‌شود»؛ مسیر دستی (نام+SignaturePad+چک‌باکس) فقط برای کاربران بدون امضای تأییدشده باقی است و `stamp:''` می‌فرستد؛ reject/na/reopen دست نخورد.
- src/app/api/cases/[id]/final/route.ts: `finalStamp: orNull(body.stamp)` در db.case.update و `approvedStamp: orNull(body.stamp)` در s9Update.
- Section9Form.tsx: برای پزشک/ادمین دارای امضای تأییدشده — SignaturePad پزشک با باکس پیش‌نمایش (امضا+مهر+متن) جایگزین شد؛ body ارسالی: `finalSignature: user.signatureData`, `stamp: user.stampData||undefined`; دکمه ثبت «ثبت امضا و مهر پزشک»؛ کارت نتیجه finalSignature + finalStamp را با هم رندر می‌کند.
- CaseDetailView.tsx: `visibleDefs = SECTION_DEFS.filter(def => visibleKeys.has(def.key))` با `visibleKeys = visibleSectionsFor(role)`; آکاردئون بخش‌ها روی visibleDefs; برای کارشناسان Alert اطلاع‌ی «فقط بخش‌های مرتبط با نقش شما در این پرونده نمایش داده می‌شود.» (پالت cyan); S1Card برای همه نقش‌ها نمایان (کارشناسان فقط‌نمایش); firstOpenKey بین بخش‌های قابل‌مشاهده.
- CasesView.tsx: برای HSE/AUDIOLOGIST/OPTOMETRIST/LAB — Toggle «فقط کارهای من» (پیش‌فرض ON، variant outline، state=on با teal) + Badge شمارنده myPendingCount با toFa؛ فیلتر client-side: `it.sections.some(s => mySectionKeys.has(s.key) && PENDING_STATUSES.includes(s.status))` که mySectionKeys از SECTION_DEFS با editorRoles شامل نقش من ساخته می‌شود؛ جدول روی visibleItems؛ پیام خالی اختصاصی؛ برای سایر نقش‌ها Toggle رندر نمی‌شود.
- DashboardView.tsx: کارت «کارهای من» (فقط کارشناسان، بعد از KPIها) با فچ `/api/cases` و همان فیلتر؛ ردیف‌ها: شماره پرونده (فارسی، ltr) + نام شاغل + Badge بخش‌های در انتظار (sectionTitle) + آیکون چشم؛ کلیک ردیف → openCase؛ سقف ۱۰ ردیف؛ دکمه «مشاهده همه» → setView('cases')؛ خالی: «مورد باز برای شما وجود ندارد».
- Lint fixes: درون‌خطی‌کردن محمول فیلتر در useMemo (react-hooks/preserve-manual-memoization)؛ حذف setLoadingMyCases همگام در ابتدای افکت (react-hooks/set-state-in-effect) — الگوی مشابه recentCases.

## Verification
- `npx tsc --noEmit` (بدون examples/skills): ۰ خطا
- `bun run lint`: پاک
- dev.log: کامپایل موفق، بدون خطا

## API payloads
- Approve بخش: `POST /api/cases/[id]/section/[key]` → `{ action:'approve', name, signature, stamp, ...(extraApprovePayload) }`
- نظریه نهایی: `POST /api/cases/[id]/final` → `{ finalOpinion, ..., finalSignature, stamp }` → ذخیره در Case.finalSignature/finalStamp و Section(S9).approvedSignature/approvedStamp
- «کارهای من»: `GET /api/cases` (limit پیش‌فرض ۲۰۰) + فیلتر client-side روی sections با وضعیت‌های NOT_STARTED|IN_PROGRESS|NEEDS_CORRECTION|SENT_FOR_REVIEW

## Notes for orchestrator
- مهر فقط در مسیر تک‌کلیکی (امضای تأییدشده) درج می‌شود؛ مسیر دستی بوم عمداً stamp خالی می‌فرستد (طبق نیاز).
- ADMIN/MANAGER دارای امضای تأییدشده نیز از دکمه تک‌کلیکی استفاده می‌کنند (شامل S2 و بازگشایی‌ها).
- no change به فایل‌های مشترک (types/constants/case-utils/AppShell/PrintView/schema).
