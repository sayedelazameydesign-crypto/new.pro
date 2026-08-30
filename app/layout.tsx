import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "نواة AI — مساعد ذكي مجاني",
  description: "منصة محادثة ذكية كاملة تعمل مجانًا بمفاتيح Gemini أو Hugging Face — بدون بطاقة، بدون تكلفة.",
  // PWA (المرحلة 6): تثبيت على iOS/سطح المكتب
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "نواة AI",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-180.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
