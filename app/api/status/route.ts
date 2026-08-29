// ===== GET /api/status — هل المفاتيح مفعّلة؟ (بدون كشف القيم) =====

import { hasGemini, hasHuggingFace } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ gemini: hasGemini(), huggingface: hasHuggingFace() });
}
