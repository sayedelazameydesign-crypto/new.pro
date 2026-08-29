// ===== مفاتيح المتصفح (BYOK) — لوحة إدخال المفاتيح =====
// تُحفظ في localStorage وتُرسل مع كل طلب — تفعيل فوري دون لمس متغيرات Vercel.
// إذا وُجد المفتاح في بيئة الخادم، فله الأولوية (إعدادات Vercel > لوحة المتصفح).

import { safeGet, safeSet } from "./utils";
import type { ProviderKind } from "./models";

export type KeyName = "GEMINI_API_KEY" | "GROQ_API_KEY" | "HF_TOKEN" | "TAVILY_API_KEY";

const STORE = "nawah:keys";

export const PROVIDER_TO_KEY: Partial<Record<ProviderKind, KeyName>> = {
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  huggingface: "HF_TOKEN",
  search: "TAVILY_API_KEY",
};

export function loadKeys(): Partial<Record<KeyName, string>> {
  try {
    const raw = safeGet(STORE);
    return raw ? (JSON.parse(raw) as Partial<Record<KeyName, string>>) : {};
  } catch {
    return {};
  }
}

export function getKey(name: KeyName): string {
  return loadKeys()[name] ?? "";
}

export function saveKey(name: KeyName, value: string): void {
  const keys = loadKeys();
  const v = value.trim();
  if (v) keys[name] = v;
  else delete keys[name];
  safeSet(STORE, JSON.stringify(keys));
}
