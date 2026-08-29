// ===== /api/conversations — مزامنة المحادثات عبر Neon =====
// GET    ?deviceId=  → سحب (pull)
// PUT    {deviceId, conversations, settings} → دفع استبدالي (push)
// DELETE ?deviceId=  → مسح بيانات الجهاز من السحابة
// بدون DATABASE_URL → { enabled:false } ويعمل كل شيء كما كان (سلوك قديم)

import { NextRequest } from "next/server";
import { pullDevice, pushDevice, deleteDevice } from "@/lib/storage-neon";
import type { Conversation, Settings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_PAYLOAD = 3_000_000; // 3MB بأمان تحت حد serverless
const MAX_CONVS = 300;
const MAX_MSGS_PER_CONV = 800;
const MAX_MSG_CHARS = 50_000;
const DEVICE_RE = /^[a-zA-Z0-9-]{8,80}$/;

const syncEnabled = () => !!process.env.DATABASE_URL;

/** تعقيم المحادثات القادمة من العميل — نبني كائنات نظيفة فقط */
function sanitizeConversations(raw: unknown): Conversation[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Conversation[] = [];
  for (const c of raw.slice(0, MAX_CONVS)) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.updatedAt !== "number") continue;
    const messages = Array.isArray(o.messages) ? o.messages.slice(0, MAX_MSGS_PER_CONV) : [];
    const cleanMessages = messages
      .filter((m: unknown) => {
        const mm = m as Record<string, unknown>;
        return (
          mm &&
          typeof mm === "object" &&
          typeof mm.id === "string" &&
          (mm.role === "user" || mm.role === "assistant") &&
          typeof mm.content === "string"
        );
      })
      .map((m: unknown) => {
        const mm = m as Record<string, unknown>;
        return {
          id: mm.id as string,
          role: mm.role as "user" | "assistant",
          content: (mm.content as string).slice(0, MAX_MSG_CHARS),
          createdAt: typeof mm.createdAt === "number" ? mm.createdAt : Date.now(),
          model: typeof mm.model === "string" ? mm.model : undefined,
        };
      });
    out.push({
      id: o.id,
      title: typeof o.title === "string" ? o.title.slice(0, 120) : "محادثة",
      createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
      updatedAt: o.updatedAt,
      messages: cleanMessages,
    });
  }
  return out;
}

function sanitizeSettings(raw: unknown): Partial<Settings> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (typeof o.modelId === "string") out.modelId = o.modelId.slice(0, 120);
  if (typeof o.system === "string") out.system = o.system.slice(0, 4000);
  if (typeof o.temperature === "number" && Number.isFinite(o.temperature)) {
    out.temperature = Math.min(1.5, Math.max(0, o.temperature));
  }
  if (o.theme === "dark" || o.theme === "light") out.theme = o.theme;
  if (o.lang === "ar" || o.lang === "en") out.lang = o.lang;
  return out;
}

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId") ?? "";
  if (!DEVICE_RE.test(deviceId)) {
    return Response.json({ error: "deviceId غير صالح" }, { status: 400 });
  }

  if (!syncEnabled()) return Response.json({ enabled: false });

  try {
    const payload = await pullDevice(deviceId);
    if (!payload) return Response.json({ enabled: true, conversations: [], settings: null });
    const conversations = sanitizeConversations(payload.conversations) ?? [];
    const settings = sanitizeSettings(payload.settings);
    return Response.json({ enabled: true, conversations, settings });
  } catch (err) {
    return Response.json(
      { error: "تعذر الاتصال بقاعدة البيانات", detail: err instanceof Error ? err.message : "" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return Response.json({ error: "طلب تالف" }, { status: 400 });
  }
  if (raw.length > MAX_PAYLOAD) {
    return Response.json({ error: "الحمولة أكبر من الحد" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  // التحقق من الصحة أولًا — بغض النظر عن حالة قاعدة البيانات
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  if (!DEVICE_RE.test(deviceId)) {
    return Response.json({ error: "deviceId غير صالح" }, { status: 400 });
  }
  const conversations = sanitizeConversations(body.conversations);
  if (!conversations) {
    return Response.json({ error: "conversations غير صالحة" }, { status: 400 });
  }
  const settings = sanitizeSettings(body.settings);

  if (!syncEnabled()) return Response.json({ enabled: false });

  try {
    await pushDevice(deviceId, { v: 1, conversations, settings: settings ?? {} });
    return Response.json({ enabled: true, ok: true });
  } catch (err) {
    return Response.json(
      { error: "تعذر الحفظ في قاعدة البيانات", detail: err instanceof Error ? err.message : "" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId") ?? "";
  if (!DEVICE_RE.test(deviceId)) {
    return Response.json({ error: "deviceId غير صالح" }, { status: 400 });
  }

  if (!syncEnabled()) return Response.json({ enabled: false });

  try {
    await deleteDevice(deviceId);
    return Response.json({ enabled: true, ok: true });
  } catch {
    return Response.json({ error: "تعذر الحذف" }, { status: 500 });
  }
}
