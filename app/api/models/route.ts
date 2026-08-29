// ===== GET /api/models — قائمة الموديلات المتاحة =====

import { MODELS } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ models: MODELS });
}
