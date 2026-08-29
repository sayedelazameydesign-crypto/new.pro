// ===== طبقة التخزين: غيّرها لاحقًا (Supabase/Neon/Postgres) دون لمس أي شيء آخر =====
// التطبيق يتعامل مع الواجهة فقط — استبدل LocalStore بكائن يحقق نفس الواجهة.

import type { Conversation, Settings } from "./types";
import { safeGet, safeSet, uid } from "./utils";

export const DEFAULT_TITLE = "محادثة جديدة";

export interface ConversationStore {
  load(): Promise<Conversation[]>;
  saveAll(convs: Conversation[]): Promise<void>;
  loadSettings(): Promise<Partial<Settings>>;
  saveSettings(s: Settings): Promise<void>;
}

/** تنفيذ محلي (LocalStorage) — يعمل فورًا، ويُستبدل بقاعدة بيانات عند الحاجة */
export class LocalStore implements ConversationStore {
  private convKey = "nawah:convs";
  private setKey = "nawah:settings";

  async load(): Promise<Conversation[]> {
    try {
      const raw = safeGet(this.convKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveAll(convs: Conversation[]): Promise<void> {
    safeSet(this.convKey, JSON.stringify(convs));
  }

  async loadSettings(): Promise<Partial<Settings>> {
    try {
      const raw = safeGet(this.setKey);
      if (!raw) return {};
      return JSON.parse(raw) ?? {};
    } catch {
      return {};
    }
  }

  async saveSettings(s: Settings): Promise<void> {
    safeSet(this.setKey, JSON.stringify(s));
  }
}

export const DEFAULTS_SETTINGS: Settings = {
  modelId: "gemini:gemini-2.5-flash",
  system: "",
  temperature: 0.7,
  theme: "dark",
  lang: "ar",
};

export function newConversation(): Conversation {
  const now = Date.now();
  return { id: uid(), title: DEFAULT_TITLE, createdAt: now, updatedAt: now, messages: [] };
}

/** أول 34 حرفًا من أول رسالة المستخدم كعنوان */
export function titleFromMessages(messages: { role: string; content: string }[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return DEFAULT_TITLE;
  const t = first.content.replace(/\s+/g, " ").trim();
  return t.length > 34 ? t.slice(0, 34).trimEnd() + "…" : t;
}
