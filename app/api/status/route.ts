// ===== GET /api/status — هل المفاتيح مفعّلة؟ (بدون كشف القيم) =====

import { hasGemini, hasHuggingFace, hasGroq, hasTavily, hasGithubModels } from "@/lib/ai";
import { providerBreaker } from "@/lib/ai/breaker";
import { isImageGenerationEnabled } from "@/lib/flags";
import { rateLimitBackend } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    gemini: hasGemini(),
    huggingface: hasHuggingFace(),
    groq: hasGroq(),
    github: hasGithubModels(),
    search: hasTavily(),
    image: isImageGenerationEnabled(),
    rateLimit: rateLimitBackend(),
    breakers: providerBreaker.snapshot(),
  });
}
