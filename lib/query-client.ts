// ===== حالة الخادم/الكاش (TanStack Query) — المرحلة D1 (Core Validation) =====
// مهيّئ QueryClient مركزي — يُستخدم عند تبني نقاط fetch جديدة.
// القاعدة: لا نستبدل الجلب الحالي بالكامل — فقط ما نضيفه جديدًا.

import { QueryClient } from "@tanstack/react-query";

/** مهيّئ واحد لكل جلسة (يُثبَّت داخل مكوّن Client — منع التسريب بين الطلبات) */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // حالة المزودين لا تتغير كل لحظة
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// مفاتيح الاستعلام المركزية (تجنب تكرار السلاسل النصية)
export const queryKeys = {
  providerStatus: ["provider-status"] as const,
  models: ["models"] as const,
  authStatus: ["auth-status"] as const,
};
