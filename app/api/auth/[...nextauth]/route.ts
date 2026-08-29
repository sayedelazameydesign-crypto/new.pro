// ===== /api/auth/[...nextauth] — نقاط Auth.js (تسجيل الدخول/الجلسة/الخروج) =====
// بدون AUTH_SECRET أو DATABASE_URL → 503 برسالة واضحة (لا يكسر شيئًا)

import { handlers, authEnabled } from "@/lib/auth";
import type { NextRequest } from "next/server";

function disabled() {
  return new Response(
    JSON.stringify({ error: "الحسابات غير مفعّلة على هذا الخادم (أضف AUTH_SECRET + DATABASE_URL)" }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

const getH = handlers.GET as unknown as (req: NextRequest) => Promise<Response>;
const postH = handlers.POST as unknown as (req: NextRequest) => Promise<Response>;

export async function GET(req: NextRequest) {
  return authEnabled() ? getH(req) : disabled();
}

export async function POST(req: NextRequest) {
  return authEnabled() ? postH(req) : disabled();
}
