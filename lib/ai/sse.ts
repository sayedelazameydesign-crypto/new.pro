// ===== قارئ SSE (Server-Sent Events) مشترك لكل المزودين =====

export async function* chunkLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        // أسطر التعليقات في SSE تبدأ بـ ":" — تُتجاهل (مواصفة SSE)
        if (line && !line.startsWith(":")) yield line;
      }
    }
    if (buf.trim()) yield buf.trim();
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }
}

export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  for await (const line of chunkLines(body)) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    yield payload;
  }
}
