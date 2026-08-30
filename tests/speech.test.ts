// ===== اختبارات الصوت (المرحلة 5.3) — وحدة مباشرة على lib/speech =====
// بلا DOM ولا شبكة: نمرر كائنات API وهمية (stub) لكل الدوال الحساسة.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SPEECH_LANG,
  cancelSpeech,
  cleanForSpeech,
  createRecognizer,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  pauseSpeech,
  pickVoice,
  resumeSpeech,
  speak,
  speechAvailable,
  splitForSpeech,
  startListening,
  stopListening,
  stopSpeak,
} from "../lib/speech";

// ── 1) تنظيف Markdown قبل القراءة ──
test("S-1 cleanForSpeech يزيل ترميز Markdown ويربط النص المقروء", () => {
  const md =
    "# عنوان\nقول **عريض** و*مائل* و`كود`\n- عنصر\n[رابط نصي](https://x.com)\n![صورة](data:image/png;base64,XXX)\n`block`";
  const out = cleanForSpeech(md);
  assert.ok(!out.includes("**") && !out.includes("##") && !out.includes("`"));
  assert.ok(!out.includes("https://") && !out.includes("data:image"));
  assert.ok(out.includes("عريض") && out.includes("رابط نصي"));
});

test("S-1b cleanForSpeech يحوّل الصور المضمّنة إلى كلمة «صورة»", () => {
  const out = cleanForSpeech("هذه ![نتيجة](data:image/png;base64,abc) جيدة");
  assert.ok(out.includes("صورة") && !out.includes("data:image"));
  assert.ok(!out.includes("!["));
});

// ── 2) تقسيم النص الطويل ──
test("S-2 splitForSpeech يقسّم ضمن الحد ويبقي الجمل القصيرة", () => {
  const long =
    "هذه جملة أولى قصيرة. " +
    "هذه جملة ثانية طويلة جدًا تتحدث عن الكثير من الأمور التفصيلية المتشعبة التي لا تنتهي عند حد معين، " +
    "وتستمر أكثر وأكثر حتى تتجاوز الحد الأقصى للمقطع الصوتي الواحد في هذا الاختبار. " +
    "وجملة أخيرة.";
  const parts = splitForSpeech(long, 80);
  assert.ok(parts.length >= 3, `تقسيم إلى ${parts.length} أجزاء`);
  for (const p of parts) {
    assert.ok(p.length <= 80, `كل جزء ضمن الحد (${p.length}/${80}): ${p.slice(0, 30)}…`);
  }
  const joined = parts.join(" ");
  assert.ok(joined.includes("أولى قصيرة") && joined.includes("أخيرة"));
});

// ── 3) اختيار الصوت العربي ──
test("S-3 pickVoice يفضّل صوتًا عربيًا على غيره", () => {
  const voices = [
    { lang: "en-US", name: "Aria" },
    { lang: "ar-SA", name: "Zariyah" },
    { lang: "fr-FR", name: "Amelie" },
  ];
  const v = pickVoice(voices, "ar-SA");
  assert.equal(v?.lang, "ar-SA");
  assert.equal(v?.name, "Zariyah");

  // بلا أصوات باللغة → undefined (لا نفرض صوتًا أجنبيًا على نص عربي؛ المتصفح يتصرف)
  assert.equal(pickVoice([{ lang: "en-US", name: "Aria" }], "ar"), undefined);
  assert.equal(pickVoice([], "ar"), undefined);
});

// ── 4) كشف الدعم ──
test("S-4 speechAvailable يكتشف إملاء وقراءة من البيئة المحقونة", () => {
  assert.deepEqual(speechAvailable({}), { dictation: false, tts: false });
  const F = function () {};
  const synth = { cancel() {}, speak() {} };
  assert.deepEqual(speechAvailable({ recognition: F, synthesis: synth }), {
    dictation: true,
    tts: true,
  });
});

// ── 5) منشئ الإملاء: بلا دعم → null، ومع واجهة وهمية → يعمل ──
test("S-5 createRecognizer يعيد null بلا دعم، ويعمل مع واجهة وهمية", () => {
  assert.equal(createRecognizer({}, "ar-SA", { onText() {}, onEnd() {}, onError() {} }), null);

  const events: Record<string, unknown> = {};
  function FakeRec() {
    return {
      set lang(v: string) {},
      set continuous(v: boolean) {},
      set interimResults(v: boolean) {},
      get onresult() {
        return events.onresult;
      },
      set onresult(v: unknown) {
        events.onresult = v;
      },
      set onend(v: unknown) {
        events.onend = v;
      },
      set onerror(v: unknown) {
        events.onerror = v;
      },
      start() {
        events.started = true;
      },
      stop() {
        events.stopped = true;
      },
      abort() {
        events.aborted = true;
      },
    };
  }
  let text = "";
  let ended = false;
  let errorCode = "";
  const rec = createRecognizer({ recognition: FakeRec }, "ar-SA", {
    onText: (t) => (text = t),
    onEnd: () => (ended = true),
    onError: (c) => (errorCode = c),
  });
  assert.ok(rec);
  rec.start();
  assert.equal(events.started, true);

  // محاكاة نتيجة جزئية ثم نهائية
  const handler = events.onresult as (e: unknown) => void;
  handler({
    results: [{ isFinal: true, 0: { transcript: "مرحبا" } }, { isFinal: false, 0: { transcript: "بالعالم" } }],
  });
  assert.equal(text, "مرحبا بالعالم");

  rec.stop();
  assert.equal(events.stopped, true);
  (events.onend as () => void)();
  assert.equal(ended, true);

  (events.onerror as (e: { error?: string }) => void)({ error: "not-allowed" });
  assert.equal(errorCode, "not-allowed");

  rec.abort();
  assert.equal(events.aborted, true);
});

// ── 6) القراءة بصوت: بلا دعم → false، ومع واجهة وهمية → تُقسَّم وتُقرأ بالترتيب ──
test("S-6 speak يقرأ النص ويقسمه ويستدعي cancel أولًا", () => {
  assert.equal(speak({}, "اختبار", "ar-SA"), false);

  const spoken: string[] = [];
  const synth = {
    cancel() {
      spoken.push("CANCEL");
    },
    speak(u: unknown) {
      spoken.push(u as string);
    },
    getVoices: () => [{ lang: "ar-SA", name: "Zariyah" }],
  };
  function FakeUtterance(text: string) {
    const self: Record<string, unknown> = { text };
    return self;
  }
  let ended = false;
  const long = "جملة أولى قصيرة. ".repeat(6); // تتجاوز 180 حرفًا بعد التنظيف
  const ok = speak(
    { synthesis: synth, Utterance: FakeUtterance },
    long,
    "ar-SA",
    { onEnd: () => (ended = true) }
  );
  assert.equal(ok, true);
  assert.equal(ended, false); // لم يُستدعَ onEnd بعد (لا يوجد جهاز ينطق فعلًا في هذا الاختبار)
  assert.equal(spoken[0], "CANCEL"); // يوقف السابق أولًا
  assert.ok(spoken.length >= 2, `قُسّم إلى ${spoken.length - 1} مقاطع`);
});

test("S-6b speak يتابع المقاطع حتى النهاية ثم يستدعي onEnd", () => {
  const queue: Array<{ text: string; onend: () => void }> = [];
  const synth = {
    cancel() {},
    speak(u: { text: string; onend: () => void }) {
      queue.push(u);
    },
  };
  function FakeUtterance(text: string) {
    return { text };
  }
  let ended = false;
  speak({ synthesis: synth, Utterance: FakeUtterance }, "أ. ".repeat(120), "ar", { onEnd: () => (ended = true) });
  // الدفعة الأولى تُقرأ فورًا؛ المقاطع التالية تتدفق عبر onend — نتابع حتى النهاية
  for (let i = 0; i < queue.length; i++) queue[i].onend();
  assert.ok(queue.length >= 2, `قُرئ ${queue.length} مقطع`);
  assert.equal(ended, true);
});

// ── 7) إيقاف القراءة ──
test("S-7 stopSpeak يستدعي cancel ويتحمل غياب الواجهات", () => {
  let canceled = 0;
  stopSpeak({ synthesis: { cancel: () => canceled++ } });
  assert.equal(canceled, 1);
  stopSpeak({}); // لا يرمي خطأ
});

// ===== واجهة الصوت المعيارية — المرحلة D1 (S-8..S-12) =====

test("S-8 isSpeechRecognitionSupported / isSpeechSynthesisSupported تكتشف من البيئة", () => {
  assert.equal(isSpeechRecognitionSupported(), false); // node بلا window
  assert.equal(isSpeechSynthesisSupported(), false);
  assert.equal(isSpeechRecognitionSupported({ recognition: class {} }), true);
  assert.equal(isSpeechSynthesisSupported({ synthesis: {}, Utterance: class {} }), true);
  assert.equal(isSpeechSynthesisSupported({ Utterance: class {} }), false); // بلا synthesis
});

test("S-9 startListening يبدأ فورًا مع دعم، ويعيد null بلا دعم", () => {
  let started = 0;
  class FakeRec {
    lang = ""; continuous = false; interimResults = false;
    onresult: unknown = null; onend: unknown = null; onerror: unknown = null;
    start() { started++; }
    stop() {} abort() {}
  }
  const rec = startListening({ recognition: FakeRec }, "ar-EG", {
    onText: () => {}, onEnd: () => {}, onError: () => {},
  });
  assert.ok(rec);
  assert.equal(started, 1);
  assert.equal(isSpeechRecognitionSupported({ recognition: FakeRec }), true);
  // بلا دعم
  assert.equal(startListening({}, "ar", { onText() {}, onEnd() {}, onError() {} }), null);
});

test("S-10 stopListening يوقف الجلسة ويتحمل null", () => {
  let stopped = 0;
  const rec = {
    active: true,
    start() {}, stop() { stopped++; }, abort() {},
  };
  stopListening(rec);
  assert.equal(stopped, 1);
  assert.doesNotThrow(() => stopListening(null));
  assert.doesNotThrow(() => stopListening(undefined));
});

test("S-11 pauseSpeech / resumeSpeech يمرران النداءات ويتحملان الغياب", () => {
  const calls: string[] = [];
  const api = { synthesis: { pause: () => calls.push("pause"), resume: () => calls.push("resume") } };
  pauseSpeech(api);
  resumeSpeech(api);
  assert.deepEqual(calls, ["pause", "resume"]);
  assert.doesNotThrow(() => pauseSpeech({}));
  assert.doesNotThrow(() => resumeSpeech({}));
});

test("S-12 cancelSpeech يلغي القراءة (مرادف stopSpeak)", () => {
  let cancelled = 0;
  cancelSpeech({ synthesis: { cancel: () => cancelled++ } });
  assert.equal(cancelled, 1);
  assert.doesNotThrow(() => cancelSpeech({}));
});

test("S-13 DEFAULT_SPEECH_LANG = ar-EG (الافتراضي المطلوب)", () => {
  assert.equal(DEFAULT_SPEECH_LANG, "ar-EG");
});
