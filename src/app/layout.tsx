import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "IHMS-OHE | سامانه مدیریت معاینات طب کار",
  description: "سامانه جامع مدیریت پذیرش، معاینات پزشکی، گردش کار تأیید متخصصان و صدور گزارش نهایی طب کار",
  icons: {
    icon: "/ihms-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster position="bottom-left" richColors dir="rtl" />
      </body>
    </html>
  );
}
