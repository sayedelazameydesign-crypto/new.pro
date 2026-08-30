// ===== الصوت — المرحلة 5.3 (ROADMAP): Web Speech API — واجهة فقط، بلا خادم =====
// إملاء عبر SpeechRecognition + قراءة الردود عبر speechSynthesis.
// الأمان/النطاق: يعمل كليًا في متصفح المستخدم — لا شبكة، لا مفاتيح، لا تسجيل.
// قابلية الاختبار: كل الوظائف نقية أو تقبل كائن API محقونًا (بلا DOM في node).

export interface SpeechApi {
  recognition?: unknown; // SpeechRecognition | webkitSpeechRecognition (constructor)
  synthesis?: unknown; // speechSynthesis
  Utterance?: unknown; // SpeechSynthesisUtterance (constructor)
}

/** استخراج واجهات الصوت من بيئة التشغيل (متصفح فقط — تعيد كائنًا فارغًا في node) */
export function ambientSpeechApi(): SpeechApi {
  if (typeof window === "undefined") return {};
  const w = window as unknown as Record<string, unknown>;
  return {
    recognition: w.SpeechRecognition ?? w.webkitSpeechRecognition,
    synthesis: w.speechSynthesis,
    Utterance: w.SpeechSynthesisUtterance,
  };
}

/** إزالة ترميز Markdown قبل القراءة (روابط/صور/أكواد/تنسيق/جداول) */
export function cleanForSpeech(text: string): string {
  return (
    text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " صورة ") // صور مضمّنة / روابط صور
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // روابط نصية → نصها
      .replace(/```[\s\S]*?```/g, (m) => m.replace(/[#*_`>|]/g, " ")) // كتل كود
      .replace(/`([^`]*)`/g, "$1") // كود سطري
      .replace(/\*\*([^*]+)\*\*/g, "$1") // عريض
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1") // مائل
      .replace(/^#{1,6}\s+/gm, "") // عناوين
      .replace(/^>\s?/gm, "") // اقتباسات
      .replace(/^[-*+]\s+/gm, "") // قوائم
      .replace(/^\d+[.)]\s+/gm, "") // قوائم مرقمة
      .replace(/^\s*\|.*\|\s*$/gm, " ") // صفوف جداول
      .replace(/[|_]{3,}/g, " ")
      .replace(/["«»]/g, (c) => (c === "«" || c === "»" ? " " : c))
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * تقسيم النص إلى أجزاء قابلة للنطق (ضمن حد أقصى) على حدود الجمل ثم الفواصل،
 * مع دمج الأجزاء القصيرة المتجاورة، وقسمة النهائية على حدود الكلمات عند الحاجة.
 */
export function splitForSpeech(text: string, max = 180): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];
  const pieces: string[] = [];

  /** قسّم نصًا متبقّيًا على حدود مسافات إن تجاوز الحد (مسافة أخيرة ≤ max) */
  const cutOnWords = (s: string) => {
    let rest = s.trim();
    while (rest.length > max) {
      const slice = rest.slice(0, max + 1);
      let cut = slice.lastIndexOf(" ");
      if (cut <= 0) cut = max; // كلمة واحدة تتجاوز الحد — قصّ صارمًا
      pieces.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) pieces.push(rest);
  };

  for (const unit of t.split(/(?<=[.!?؟])\s+/).filter(Boolean)) {
    if (unit.length <= max) {
      pieces.push(unit);
      continue;
    }
    // جملة طويلة: قسّم على الفواصل، وأي بقية فوق الحد تُقسَّم على الكلمات
    let cur = "";
    const segs = unit.split(/(?<=[،,;؛:])\s*/).filter(Boolean);
    for (const seg of segs) {
      if (seg.length > max) {
        if (cur) {
          pieces.push(cur);
          cur = "";
        }
        cutOnWords(seg);
      } else if (cur && (cur + " " + seg).length > max) {
        pieces.push(cur);
        cur = seg;
      } else {
        cur = cur ? cur + " " + seg : seg;
      }
    }
    if (cur) pieces.push(cur);
  }

  // دمج المتجاورات القصيرة (يطابق الهدف: مقاطع مريحة لا قصاصات)
  const merged: string[] = [];
  for (const p of pieces) {
    const prev = merged[merged.length - 1];
    if (prev && prev.length + p.length + 1 <= max) {
      merged[merged.length - 1] = prev + " " + p;
    } else {
      merged.push(p);
    }
  }
  return merged.filter((s) => s.trim().length > 0);
}

/** اختيار أفضل صوت متاح للغة (يفضّل أصواتًا أنثوية شهيرة عربية ثم أي صوت باللغة) */
export function pickVoice(
  voices: { lang?: string; name?: string }[],
  lang: string
): { lang?: string; name?: string } | undefined {
  const base = lang.toLowerCase().split("-")[0];
  const pref: RegExp[] = [/female|aria|zari|hoda|salma|najwa|zeina/i, /male|tariq|hassan|naief|hamad/i];
  for (const re of pref) {
    const v = voices.find((x) => (x.lang || "").toLowerCase().startsWith(base) && re.test(x.name || ""));
    if (v) return v;
  }
  return (
    voices.find((x) => (x.lang || "").toLowerCase().startsWith(base)) ||
    voices.find((x) => (x.lang || "").toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)))
  );
}

/** هل الصوت متاح في هذه البيئة؟ (إملاء / قراءة) */
export function speechAvailable(api?: SpeechApi): { dictation: boolean; tts: boolean } {
  const a = api ?? ambientSpeechApi();
  return { dictation: typeof a.recognition === "function", tts: !!a.synthesis };
}

export interface RecognizerHandlers {
  onText: (text: string) => void; // النص المُملى حتى الآن (جزئي أو نهائي)
  onEnd: () => void; // توقف الاستماع (تلقائي أو يدوي)
  onError: (code: string) => void;
}

export interface Recognizer {
  start: () => void;
  stop: () => void;
  abort: () => void;
  active: boolean;
}

/** شكل كائن SpeechRecognition الفعلي (الخصائص المستخدمة فقط) */
interface RawRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: {
    results?: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/** إنشاء جلسة إملاء (SpeechRecognition) — تعيد null إن كانت غير مدعومة */
export function createRecognizer(
  api: SpeechApi,
  lang: string,
  h: RecognizerHandlers
): Recognizer | null {
  const Ctor = api?.recognition as (new () => RawRecognition) | undefined;
  if (typeof Ctor !== "function") return null;
  let rec: RawRecognition;
  try {
    rec = new Ctor();
  } catch {
    return null;
  }
  let active = false;
  rec.lang = lang;
  rec.continuous = true; // يستمر حتى يضغط المستخدم أو انتهاء الهدوء الطويل
  rec.interimResults = true;
  rec.onresult = (e) => {
    if (!e?.results) return;
    let finalText = "";
    let interim = "";
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (!r) continue;
      if (r.isFinal) finalText += (r[0]?.transcript ?? "") + " ";
      else interim += r[0]?.transcript ?? "";
    }
    const text = (finalText + interim).trim();
    if (text) h.onText(text);
  };
  rec.onend = () => {
    active = false;
    h.onEnd();
  };
  rec.onerror = (e) => {
    active = false;
    h.onError(String(e?.error ?? "unknown"));
  };
  return {
    get active() {
      return active;
    },
    start() {
      if (active) return;
      try {
        rec.start();
        active = true;
      } catch {
        /* يبدأ مرة واحدة فقط لكل جلسة — تجاهل إعادة البدء */
      }
    },
    stop() {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
    abort() {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    },
  };
}

export interface SpeakOptions {
  rate?: number;
  onEnd?: () => void;
  onError?: (code: string) => void;
}

/**
 * قراءة نص بصوت مسموع (TTS) — تقسيم تلقائي، إيقاف أي قراءة سابقة.
 * تعيد false إن كانت القراءة غير مدعومة.
 */
export function speak(api: SpeechApi, text: string, lang: string, opts: SpeakOptions = {}): boolean {
  const synth = api?.synthesis as
    | { cancel: () => void; speak: (u: unknown) => void; getVoices?: () => unknown[] }
    | undefined;
  const UtteranceCtor = api?.Utterance as (new (t: string) => Record<string, unknown>) | undefined;
  if (!synth || typeof UtteranceCtor !== "function") return false;

  const chunks = splitForSpeech(cleanForSpeech(text));
  if (!chunks.length) return false;

  synth.cancel();
  let i = 0;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    opts.onEnd?.();
  };
  const speakNext = () => {
    if (i >= chunks.length) return finish();
    const u = new UtteranceCtor(chunks[i++]);
    u.lang = lang;
    u.rate = opts.rate ?? 1;
    const voices = (synth.getVoices?.() ?? []) as { lang?: string; name?: string }[];
    const v = pickVoice(voices, lang);
    if (v) u.voice = v;
    u.onend = () => speakNext();
    u.onerror = (e: { error?: string }) => {
      if (e?.error === "interrupted" || e?.error === "canceled") finish();
      else {
        done = true;
        opts.onError?.(String(e?.error ?? "unknown"));
      }
    };
    try {
      synth.speak(u);
    } catch {
      finish();
    }
  };
  speakNext();
  return true;
}

/** إيقاف أي قراءة جارية */
export function stopSpeak(api: SpeechApi): void {
  const synth = api?.synthesis as { cancel?: () => void } | undefined;
  try {
    synth?.cancel?.();
  } catch {
    /* ignore */
  }
}
