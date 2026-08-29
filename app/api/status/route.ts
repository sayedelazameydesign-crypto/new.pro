// ===== GET /api/status — هل المفاتيح مفعّلة؟ (بدون كشف القيم) =====

import { hasGemini, hasHuggingFace, hasGroq, hasTavily } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    gemini: hasGemini(),
    huggingface: hasHuggingFace(),
    groq: hasGroq(),
    search: hasTavily(),
  });
}
