// ===== اختبارات البث (Streaming أصلي) — المرحلة D1 =====
// partial chunks / complete / interrupted / error — عبر ReadableStream وهمي بلا شبكة.

import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkLines, sseData } from "../lib/ai/sse";

function streamOf(parts: (string | Error)[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const p of parts) {
        if (p instanceof Error) c.error(p);
        else c.enqueue(enc.encode(p));
      }
      c.close();
    },
  });
}

test("W-1 أجزاء جزئية: سطر مقسوم على أكثر من chunk يُجمَّع صحيحًا", async () => {
  const got: string[] = [];
  for await (const line of chunkLines(streamOf(['data: {"a":1}\n\nda', 'ta: {"b":2}\n\n']))) {
    got.push(line);
  }
  assert.deepEqual(got, ['data: {"a":1}', 'data: {"b":2}']);
});

test("W-2 اكتمال: سطر أخير بلا newline يُلتقط، و[DONE] يُتجاهل في sseData", async () => {
  const lines: string[] = [];
  for await (const line of chunkLines(streamOf(['data: hello\n\ndata: [DONE]']))) lines.push(line);
  assert.deepEqual(lines, ["data: hello", "data: [DONE]"]);

  const data: string[] = [];
  for await (const d of sseData(streamOf(['data: hello\n\ndata: [DONE]\n\n']))) data.push(d);
  assert.deepEqual(data, ["hello"]);
});

test("W-3 انقطاع: خطأ mid-stream يُمرَّر للمستهلك بلا تسريب", async () => {
  // تدفق واقعي: يُسلّم سطرًا كاملًا أولًا ثم ينقطع — يجب أن يصل السطر ثم يُرمى الخطأ
  let pulled = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      pulled += 1;
      if (pulled === 1) {
        c.enqueue(new TextEncoder().encode("data: ok\n\n"));
      } else {
        c.error(new Error("قطع الاتصال"));
      }
    },
  });
  const seen: string[] = [];
  let err: unknown = null;
  try {
    for await (const line of chunkLines(stream)) seen.push(line);
  } catch (e) {
    err = e;
  }
  assert.deepEqual(seen, ["data: ok"]);
  assert.ok(err instanceof Error);
  assert.match(String((err as Error).message), /قطع/);
});

test("W-4 معالجة الأخطاء: أسطر فارغة وcomment تُتجاهل في chunkLines", async () => {
  const got: string[] = [];
  for await (const line of chunkLines(streamOf(["\n: ping\n\n\ndata: فقط\n\n"]))) got.push(line);
  assert.deepEqual(got, ["data: فقط"]);
});

test("W-5 إلغاء: reader يُلغى تلقائيًا عند خروج الاستهلاك مبكرًا", async () => {
  let cancelled = false;
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(enc.encode("data: 1\n\ndata: 2\n\n"));
    },
    cancel() {
      cancelled = true;
    },
  });
  for await (const line of chunkLines(stream)) { void line; break; }
  assert.equal(cancelled, true);
});
