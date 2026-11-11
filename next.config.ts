import type { NextConfig } from "next";

// برای سرو اپ زیر یک مسیر (مثلاً ihmsapp.ir/ohe از طریق پروکسی)، متغیر
// NEXT_PUBLIC_BASE_PATH=/ohe را هنگام build ست کنید؛ برای زیردامنه اختصاصی
// (ohe.ihmsapp.ir) لازم نیست و باید خالی بماند.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  basePath,
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
