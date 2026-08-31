// ===== مزود GitHub Models (مجاني عبر PAT — models:read) =====
// واجهة متوافقة مع OpenAI. المتغير عمدًا GITHUB_MODELS_TOKEN لا GITHUB_TOKEN
// (محجوز ومُحقن في Actions). الغياب → يُتخطى صامتًا من المنسّق.

import { sseData } from "../sse";
import type { ProviderIO } from "./gemini";

export const GITHUB_MODELS_URL = "https://models.github.ai/inference/chat/completions";
export const GITHUB_MODELS_DEFAULT = "openai/gpt-4o-mini";

export function githubModelsDefaultModel(): string {
  const fromEnv = process.env.GITHUB_MODELS_MODEL?.trim();
  return fromEnv || GITHUB_MODELS_DEFAULT;
}

export async function* githubModelsStream(
  opts: ProviderIO & { apiKey: string }
): AsyncGenerator<string> {
  const model = opts.model?.trim() || githubModelsDefaultModel();
  const sys = opts.system?.trim();
  const body = {
    model,
    messages:
      sys && sys.length > 0
        ? [{ role: "system", content: sys }, ...opts.messages.map((m) => ({ role: m.role, content: m.content }))]
        : opts.messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
    stream: true,
  };

  const res = await fetch(GITHUB_MODELS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    let hint = "";
    if (res.status === 401 || res.status === 403)
      hint = " التوكن غير صحيح أو بلا صلاحية models:read. أنشئ PAT من GitHub → Settings → Developer settings.";
    if (res.status === 429)
      hint = " تجاوزت حصة GitHub Models المجانية — انتظر قليلًا أو بدّل المزود.";
    if (res.status === 404) hint = " اسم الموديل غير صحيح لهذا الحساب.";
    throw new Error(`GitHub Models (${res.status}): ${t.slice(0, 300)}${hint}`);
  }
  if (!res.body) throw new Error("GitHub Models: استجابة فارغة");

  for await (const payload of sseData(res.body)) {
    try {
      const j = JSON.parse(payload);
      const delta = j?.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    } catch {
      /* تجاهل */
    }
  }
}
