// ===== مزود Google Gemini (مجاني عبر AI Studio) =====

import { sseData } from "../sse";

interface GeminiTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface ProviderIO {
  model: string;
  messages: { role: string; content: string }[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function* geminiStream(opts: ProviderIO & { apiKey: string }): AsyncGenerator<string> {
  const contents: GeminiTurn[] = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 1024,
    },
  };
  if (opts.system && opts.system.trim()) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(opts.model) +
    ":streamGenerateContent?alt=sse&key=" +
    encodeURIComponent(opts.apiKey);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    let hint = "";
    if (res.status === 400 || res.status === 404) {
      hint = " ربما اسم الموديل غير صحيح أو غير متاح لمفتاحك المجاني.";
    }
    if (res.status === 403) hint = " المفتاح غير صحيح أو انتهت حصتك المجانية.";
    if (res.status === 429) hint = " تجاوزت حد الطلبات المجاني — انتظر قليلًا.";
    throw new Error(`Gemini (${res.status}): ${t.slice(0, 300)}${hint}`);
  }
  if (!res.body) throw new Error("Gemini: استجابة فارغة");

  for await (const payload of sseData(res.body)) {
    try {
      const j = JSON.parse(payload);
      const text: string =
        j?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("") ?? "";
      if (text) yield text;
    } catch {
      /* تجاهل أجزاء غير صالحة */
    }
  }
}
