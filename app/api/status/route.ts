// ===== GET /api/status — هل المفاتيح مفعّلة؟ (بدون كشف القيم) =====

import { hasGemini, hasHuggingFace, hasGroq, hasTavily, hasGithubModels } from "@/lib/ai";
import { providerBreaker } from "@/lib/ai/breaker";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    gemini: hasGemini(),
    huggingface: hasHuggingFace(),
    groq: hasGroq(),
    github: hasGithubModels(),
    search: hasTavily(),
    breakers: providerBreaker.snapshot(),
  });
}
