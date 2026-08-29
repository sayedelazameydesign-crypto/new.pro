// ===== POST /api/chat — محادثة بتدفق نصي (streaming) =====
// يدعم Gemini و Hugging Face ووضع العرض بتراجع تلقائي — لا يفشل أبدًا.

import { NextRequest } from "next/server";
import { streamReply, resolveProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // أقصى مدة على Vercel Hobby المجاني

interface ChatBody {
  messages?: { role: string; content: string }[];
  modelId?: string;
  system?: string;
}

export async function POST(req: NextRequest) {
  let body: ChatBody = {};
  try {
    body = await req.json();
  } catch {
    /* سيُرفض أدناه */
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.filter((m) => m && m.role && typeof m.content === "string")
    : [];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || !last.content.trim()) {
    return Response.json({ error: "لا توجد رسالة مستخدم صالحة" }, { status: 400 });
  }

  const desiredModelId =
    typeof body.modelId === "string" && body.modelId ? body.modelId : "gemini:gemini-2.5-flash";

  // قرار المزود + تراجع تلقائي حسب المفاتيح المتوفرة
  const resolved = resolveProvider(desiredModelId);

  const limited = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
  const system = typeof body.system === "string" ? body.system : "";
  const maxTokens = Number(process.env.MAX_TOKENS) || 1024;

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        // إعلام الواجهة بالمزود الفعلي المستخدم
        send({ provider: resolved.provider });
        for await (const chunk of streamReply({
          provider: resolved.provider,
          model: resolved.model,
          messages: limited,
          apiKey: resolved.apiKey,
          maxTokens,
        })) {
          send({ chunk });
        }
        send({ done: true });
      } catch (err) {
        send({
          error:
            err instanceof Error ? err.message : "حدث خطأ غير متوقع من مزود الذكاء — حاول بعد قليل.",
        });
      } finally {
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
