"use client";

// ===== مزوّد TanStack Query — المرحلة D1 (Core Validation) =====
// نقطة اعتماد React Query الحقيقية: يلفّ التطبيق مرة واحدة في الجذر.
// لا يغيّر أي جلب قائم — فقط يهيئ الكاش للاستعلامات الجديدة.

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/query-client";

export default function Providers({ children }: { children: React.ReactNode }) {
  // مهيّئ واحد لكل جلسة (لا يُعاد إنشاؤه عند كل إعادة رسم)
  const [client] = useState(() => makeQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
