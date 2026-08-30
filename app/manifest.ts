// ===== PWA Manifest (المرحلة 6): تثبيت نواة AI على الهاتف/سطح المكتب =====
// يستخدمه المتصفح لعرض «أضف إلى الشاشة الرئيسية» — مع أيقونات وألوان العلامة.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نواة AI — مساعد ذكي مجاني",
    short_name: "نواة",
    description:
      "مساعد ذكاء اصطناعي عربي مجاني 100% — محادثات، ملفات، بحث، صور، صوت — بلا بطاقة ولا اشتراك.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b0d12",
    theme_color: "#6366f1",
    lang: "ar",
    dir: "rtl",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
