// ===== مزود البحث في الويب (Tavily — مجاني 1000 طلب/شهر) =====
// يبث: خلاصة + نتائج ومصادر بصيغة ماركداون — جاهز، يتفعّل فور إضافة TAVILY_API_KEY.

export async function* webSearchStream(opts: {
  query: string;
  apiKey: string;
}): AsyncGenerator<string> {
  if (!opts.apiKey) {
    throw new Error("البحث في الويب غير مفعّل — أضف TAVILY_API_KEY (مجاني من tavily.com) ثم أعد النشر.");
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
    body: JSON.stringify({
      query: opts.query,
      max_results: 5,
      search_depth: "basic",
      include_answer: true,
      include_raw_content: false,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403)
      throw new Error(`Tavily: مفتاح غير صالح (${t.slice(0, 120)})`);
    if (res.status === 429) throw new Error("Tavily: تجاوزت حصة الشهر المجانية (1000 طلب) — انتظر أو جرّب لاحقًا.");
    throw new Error(`Tavily (${res.status}): ${t.slice(0, 200)}`);
  }

  const j = (await res.json()) as {
    answer?: string;
    results?: { title: string; url: string; content?: string }[];
  };
  const results = j.results ?? [];

  yield `# 🔎 نتائج البحث: ${opts.query}\n\n`;
  if (j.answer) yield `**الخلاصة:** ${j.answer}\n\n`;
  if (results.length === 0) {
    yield "لم أجد نتائج كافية — جرّب صياغة سؤال آخر.\n";
    return;
  }
  for (const r of results.slice(0, 5)) {
    yield `### ${r.title}\n`;
    if (r.content) yield `${r.content.slice(0, 400)}\n`;
    yield `🔗 المصدر: ${r.url}\n\n`;
  }
}
