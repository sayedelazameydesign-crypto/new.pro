// ===== مزود Groq (مجاني: Llama 3.3 70B / Llama 3.1 8B) =====
// واجهة متوافقة مع OpenAI — key مجاني من https://console.groq.com

import { sseData } from "../sse";
import type { ProviderIO } from "./gemini";

export async function* groqStream(
  opts: ProviderIO & { apiKey: string }
): AsyncGenerator<string> {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const body = {
    model: opts.model,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
    stream: true,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    let hint = "";
    if (res.status === 401 || res.status === 403)
      hint = " المفتاح غير صحيح أو بلا صلاحية. أنشئ مفتاحًا من console.groq.com.";
    if (res.status === 429)
      hint = " تجاوزت حصة Groq المجانية (حوالي ١٠٠٠ طلب/يوم للنموذج الأكبر) — انتظر قليلًا أو بدّل الموديل.";
    if (res.status === 404) hint = " اسم الموديل غير صحيح لهذا الحساب.";
    throw new Error(`Groq (${res.status}): ${t.slice(0, 300)}${hint}`);
  }
  if (!res.body) throw new Error("Groq: استجابة فارغة");

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
