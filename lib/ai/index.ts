// ===== منسّق الذكاء: يختار المزود المناسب تلقائيًا =====
// أي مزود جديد = أضف ملفًا في providers/ + سطر case هنا فقط.
// السلسلة: Groq → GitHub Models → Gemini → HF → Demo
// القاطع يعزل 429/5xx عشر دقائق ثم استكشاف واحد.

import type { ProviderKind } from "../models";
import { geminiStream } from "./providers/gemini";
import { huggingfaceStream } from "./providers/huggingface";
import { groqStream } from "./providers/groq";
import { githubModelsStream, githubModelsDefaultModel } from "./providers/github-models";
import { webSearchStream } from "./providers/search";
import { demoStream } from "./providers/demo";
import {
  extractHttpStatus,
  failureKindFromError,
  isNetworkError,
  providerBreaker,
} from "./breaker";

export const hasGemini = () => !!process.env.GEMINI_API_KEY;
export const hasHuggingFace = () => !!process.env.HF_TOKEN;
export const hasGroq = () => !!process.env.GROQ_API_KEY;
export const hasTavily = () => !!process.env.TAVILY_API_KEY;
export const hasGithubModels = () => !!process.env.GITHUB_MODELS_TOKEN;

const FALLBACKS = {
  groq: { model: "openai/gpt-oss-120b", env: "GROQ_API_KEY" },
  github: { model: "openai/gpt-4o-mini", env: "GITHUB_MODELS_TOKEN" },
  gemini: { model: "gemini-2.5-flash", env: "GEMINI_API_KEY" },
  huggingface: { model: "Qwen/Qwen2.5-7B-Instruct", env: "HF_TOKEN" },
} as const;

/** ترتيب التراجع النهائي */
export const PROVIDER_CHAIN = ["groq", "github", "gemini", "huggingface"] as const;

function fallbackModel(p: keyof typeof FALLBACKS): string {
  if (p === "github") return githubModelsDefaultModel();
  return FALLBACKS[p].model;
}

/** قرار المزود مع تراجع تلقائي ذكي (Fallback) — لا يفشل الطلب أبدًا إن وُجد أي مفتاح
 * overrideKey: مفتاح مُرسل من المتصفح (لوحة المفاتيح) — يتقدّم على البيئة في الجلسة */
export function resolveProvider(modelId: string, overrideKey?: string): {
  provider: ProviderKind;
  model: string;
  apiKey: string;
} {
  const { provider, model } = splitModelIdSafe(modelId);

  // وضع العرض: لا يتراجع أبدًا — يُستخدم عمدًا من المستخدم
  if (provider === "demo") return { provider: "demo", model: "demo", apiKey: "" };

  // البحث في الويب: قدرة مستقلة — بدون مفتاح يُظهر خطأً واضحًا (لا تراجع مضلل)
  if (provider === "search") {
    return {
      provider: "search",
      model: "web",
      apiKey: overrideKey || process.env.TAVILY_API_KEY || "",
    };
  }

  // 1) المزود المطلوب نفسه: مفتاح المستخدم المحلي أولًا، ثم بيئة الخادم — يُتخطى إن كانت الدائرة مفتوحة
  if (providerBreaker.peekAvailable(provider)) {
    const direct = overrideKey
      ? { provider, model, apiKey: overrideKey.slice(0, 300) }
      : pick(model, provider);
    if (direct) return direct;
  }

  // 2) تراجع تلقائي: Groq → GitHub Models → Gemini → HF
  for (const p of PROVIDER_CHAIN) {
    const alt = pick(fallbackModel(p), p);
    if (alt) {
      console.warn("[nawah][provider-fallback]", { requested: provider, reason: "no-credential-or-open", resolved: alt.provider });
      return alt;
    }
  }

  // 3) لا يوجد أي مفتاح → وضع العرض التجريبي
  console.warn("[nawah][provider-fallback]", { requested: provider, reason: "no-credential-at-all", resolved: "demo" });
  return { provider: "demo", model: "demo", apiKey: "" };
}

function pick(
  model: string,
  p: ProviderKind
): { provider: ProviderKind; model: string; apiKey: string } | null {
  const spec = FALLBACKS[p as keyof typeof FALLBACKS];
  if (!spec) return null;
  if (!providerBreaker.isAvailable(p)) return null;
  const apiKey = process.env[spec.env];
  return apiKey ? { provider: p, model, apiKey } : null;
}

/**
 * تعقيم رسائل الخطأ: يحذف أي أثر للمفاتيح الحساسة قبل وصولها للعميل أو السجل.
 * السياسة: مفتاح المتصفح (BYOK) — لا يُسجَّل، لا يُخزَّن، لا يظهر في أخطاء، لا يمر عبر SSE.
 */
export function sanitizeError(err: unknown, ...secrets: (string | undefined)[]): string {
  let msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع من مزود الذكاء — حاول بعد قليل.";
  for (const s of secrets) {
    if (s && s.length >= 8) msg = msg.split(s).join("***");
  }
  return msg.slice(0, 400);
}

type StreamOpts = {
  provider: ProviderKind;
  model: string;
  messages: { role: string; content: string }[];
  apiKey: string;
  maxTokens: number;
  temperature?: number;
  system?: string;
};

async function* dispatch(opts: StreamOpts): AsyncGenerator<string> {
  switch (opts.provider) {
    case "search":
      yield* webSearchStream({ query: opts.messages[opts.messages.length - 1]?.content ?? "", apiKey: opts.apiKey });
      break;
    case "groq":
      yield* groqStream({
        model: opts.model,
        messages: opts.messages,
        system: opts.system,
        apiKey: opts.apiKey,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      });
      break;
    case "github":
      yield* githubModelsStream({
        model: opts.model,
        messages: opts.messages,
        system: opts.system,
        apiKey: opts.apiKey,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      });
      break;
    case "gemini":
      yield* geminiStream({
        model: opts.model,
        messages: opts.messages,
        system: opts.system,
        apiKey: opts.apiKey,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      });
      break;
    case "huggingface":
      yield* huggingfaceStream({
        model: opts.model,
        messages: opts.messages,
        system: opts.system,
        token: opts.apiKey,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      });
      break;
    case "demo":
    default:
      yield* demoStream();
      break;
  }
}

export async function* streamReply(opts: StreamOpts): AsyncGenerator<string> {
  if (opts.provider === "search" || opts.provider === "demo") {
    yield* dispatch(opts);
    return;
  }

  const attempts: StreamOpts[] = [{ ...opts }];
  for (const p of PROVIDER_CHAIN) {
    if (p === opts.provider) continue;
    const alt = pick(fallbackModel(p), p);
    if (alt) attempts.push({ ...opts, ...alt });
  }

  let lastErr: unknown;
  for (const step of attempts) {
    if (!providerBreaker.isAvailable(step.provider)) continue;
    try {
      for await (const chunk of dispatch(step)) yield chunk;
      providerBreaker.recordSuccess(step.provider);
      return;
    } catch (err) {
      lastErr = err;
      const kind = failureKindFromError(err);
      if (kind === "transient") {
        providerBreaker.recordFailure(step.provider, {
          status: extractHttpStatus(err),
          network: isNetworkError(err),
        });
      }
      console.warn("[nawah][provider-error]", {
        provider: step.provider,
        kind,
        status: extractHttpStatus(err),
      });
    }
  }

  if (lastErr) throw lastErr;
  yield* demoStream();
}

function splitModelIdSafe(id: string): { provider: ProviderKind; model: string } {
  const idx = id.indexOf(":");
  if (idx === -1) return { provider: "demo", model: id };
  let provider = id.slice(0, idx);
  // مرادفات النطاقات: "hf" يُطابق مزود Hugging Face
  if (provider === "hf") provider = "huggingface";
  if (provider === "github-models") provider = "github";
  if (
    provider !== "gemini" &&
    provider !== "huggingface" &&
    provider !== "groq" &&
    provider !== "github" &&
    provider !== "search" &&
    provider !== "demo"
  ) {
    return { provider: "demo", model: id };
  }
  return { provider: provider as ProviderKind, model: id.slice(idx + 1) };
}
