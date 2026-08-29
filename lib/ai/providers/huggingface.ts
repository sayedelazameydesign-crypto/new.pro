// ===== مزود Hugging Face (توكن مجاني + router inference) =====
// ملاحظة مهمة (اكتُشفت بالاختبار الحي): api-inference.huggingface.co لم يعد يعمل
// (نطاق متوقف/لا يستجيب) — لذا router.huggingface.co هو المسار الأساسي.

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

  // المحاولة 1: router الرسمي (يعمل حاليًا — يوجّه لأي مزود متاح لحسابك)
  let res: Response | null = null;
  let routerErr = "";
  try {
    const routerUrl = "https://router.huggingface.co/v1/chat/completions";
    const routerPayload = { ...payload, provider: { provider: "hf-inference", model: opts.model } };
    res = await fetch(routerUrl, { method: "POST", headers, body: JSON.stringify(routerPayload) });
    if (!res.ok) routerErr = `router: ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`;
  } catch (e) {
    routerErr = `router: fetch failed (${e instanceof Error ? e.message : "network"})`;
    res = null;
  }

  // المحاولة 2: endpoint الكلاسيكي (إن فشل الـ router — قد يعود مستقبلًا)
  if (!res || !res.ok) {
    try {
      const modelsUrl = `https://api-inference.huggingface.co/models/${opts.model}/v1/chat/completions`;
      res = await fetch(modelsUrl, { method: "POST", headers, body: JSON.stringify(payload) });
      if (res.ok) console.warn("HF: استخدمنا endpoint الكلاسيكي (router فشل)");
    } catch {
      res = null;
    }
  }

  if (!res) {
    throw new Error(`HuggingFace: تعذر الاتصال (${routerErr || "فشل الشبكة"})`);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => routerErr);
    let hint = "";
    if (res.status === 401 || res.status === 403)
      hint = " التوكن غير صحيح أو بلا صلاحية لهذا الموديل.";
    if (res.status === 404) hint = " الموديل غير متاح عبر inference المجاني؛ جرّب موديلًا آخر من القائمة.";
    if (res.status === 429) hint = " تجاوزت حصة المجاني — انتظر قليلًا.";
    throw new Error(`HuggingFace (${res.status}): ${String(t).slice(0, 300)}${hint}`);
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
