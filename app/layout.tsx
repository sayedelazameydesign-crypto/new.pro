import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نواة AI — مساعد ذكي مجاني",
  description: "منصة محادثة ذكية كاملة تعمل مجانًا بمفاتيح Gemini أو Hugging Face — بدون بطاقة، بدون تكلفة.",
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
