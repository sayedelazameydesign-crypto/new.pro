// ===== قراءة الملفات المرفقة واستخراج نصوصها (المرحلة 5 — ROADMAP) =====
// الصيغ المدعومة: TXT / MD / CSV / JSON (نصي مباشر) + PDF (pdf-parse) + DOCX (mammoth)
// أمان: قائمة بيضاء بالامتدادات + حد للحجم + حد للنص المستخرج + لا حفظ على القرص إطلاقًا.
// الرسالة تدمج: النص المستخرج يُلحق برسالة المستخدم الأخيرة ليراه المزود.

const MAX_FILE_BYTES = 1_000_000; // 1MB لكل ملف (بعد فك base64)
const MAX_EXTRACT_CHARS = 30_000; // سقف النص المستخرج لكل طلب
const MAX_FILES = 3;

const ALLOWED_EXT: Record<string, "text" | "json" | "pdf" | "docx"> = {
  txt: "text",
  md: "text",
  markdown: "text",
  csv: "text",
  json: "json",
  pdf: "pdf",
  docx: "docx",
};

export interface AttachInput {
  name: string;
  data: string; // base64 (من واجهة المتصفح)
}

/** استخراج نص من ملف (يُرجع نصًا مقطوعًا بسقف MAX_EXTRACT_CHARS) */
export async function extractFileText(name: string, dataBase64: string): Promise<string> {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const kind = ALLOWED_EXT[ext];
  if (!kind) {
    throw new Error(
      `صيغة الملف غير مدعومة (${ext || "بدون امتداد"}) — المتاح: TXT, MD, CSV, JSON, PDF, DOCX`
    );
  }

  const buf = Buffer.from(dataBase64, "base64");
  if (buf.length === 0) throw new Error("الملف فارغ");
  if (buf.length > MAX_FILE_BYTES) throw new Error("الملف أكبر من 1 ميجابايت");

  let text = "";
  if (kind === "pdf") {
    text = await extractPdf(buf);
  } else if (kind === "docx") {
    text = await extractDocx(buf);
  } else {
    text = buf.toString("utf8");
    if (kind === "json") {
      try {
        text = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        throw new Error("ملف JSON غير صالح");
      }
    }
  }

  if (!text.trim()) throw new Error("تعذر استخراج نص من الملف");
  return text.slice(0, MAX_EXTRACT_CHARS);
}

async function extractPdf(buf: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocx(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value ?? "";
}

/**
 * دمج المرفقات في رسالة المستخدم الأخيرة:
 *  - يتحقق: عدد/صيغة/حجم كل ملف
 *  - يستخرج النصوص ويلحقها برسالة المستخدم الأخيرة بتذييل واضح
 * يُرمى خطأ عربي واضح عند أي رفض (يُحوّله المتصل إلى 400).
 */
export async function mergeAttachments(
  files: unknown,
  target: { content: string }
): Promise<void> {
  if (!Array.isArray(files) || files.length === 0) return;
  if (files.length > MAX_FILES) throw new Error(`حد أقصى ${MAX_FILES} ملفات في الرسالة الواحدة`);

  const parts: string[] = [];
  for (const f of files.slice(0, MAX_FILES)) {
    const name = f && typeof (f as AttachInput).name === "string" ? (f as AttachInput).name.trim() : "";
    const data = f && typeof (f as AttachInput).data === "string" ? (f as AttachInput).data : "";
    if (!name || !data) throw new Error("ملف مرفق تالف");
    const text = await extractFileText(name, data);
    parts.push(`### 📎 مرفق: ${name}\n${text}`);
  }

  const header = "محتوى الملفات المرفقة (اقرأه للإجابة):\n\n";
  const body = parts.join("\n\n---\n\n");
  const merged = target.content ? `${target.content}\n\n${header}${body}` : `${header}${body}`;
  target.content = merged.slice(0, 60_000); // نفس سقف الرسائل الإجمالي في المسار
}
