// ===== مزود Hugging Face (توكن مجاني + serverless inference) =====

import { sseData } from "../sse";
import type { ProviderIO } from "./gemini";

export async function* huggingfaceStream(
  opts: ProviderIO & { token: string }
): AsyncGenerator<string> {
  const payload = {
    model: opts.model,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
  };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${opts.token}`,
  };

  // المحاولة 1: endpoint الكلاسيكي المجاني للموديل
  const modelsUrl = `https://api-inference.huggingface.co/models/${opts.model}/v1/chat/completions`;
  let res = await fetch(modelsUrl, { method: "POST", headers, body: JSON.stringify(payload) });

  // المحاولة 2: router الرسمي (يوجه لأي مزود متاح لحسابك)
  if (!res.ok) {
    const routerUrl = "https://router.huggingface.co/v1/chat/completions";
    const routerPayload = { ...payload, provider: { provider: "hf-inference", model: opts.model } };
    res = await fetch(routerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(routerPayload),
    });
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    let hint = "";
    if (res.status === 401 || res.status === 403)
      hint = " التوكن غير صحيح أو بلا صلاحية لهذا الموديل.";
    if (res.status === 404) hint = " الموديل غير متاح عبر inference المجاني؛ جرّب موديلًا آخر من القائمة.";
    if (res.status === 429) hint = " تجاوزت حصة المجاني — انتظر قليلًا.";
    throw new Error(`HuggingFace (${res.status}): ${t.slice(0, 300)}${hint}`);
  }
  if (!res.body) throw new Error("HuggingFace: استجابة فارغة");

  for await (const payload2 of sseData(res.body)) {
    try {
      const j = JSON.parse(payload2);
      const delta = j?.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    } catch {
      /* تجاهل */
    }
  }
}
