// ===== عميل المزامنة (الواجهة) — يتحدث مع /api/conversations =====
// بدون DATABASE_URL: يعيد enabled:false ويتجاهل كل شيء بأمان (سلوك قديم 100%)

import type { Conversation, Settings } from "./types";
import { safeGet, safeSet, uid } from "./utils";

const DEVICE_KEY = "nawah:device";

/** معرّف الجهاز الدائم — يُنشأ مرة واحدة لكل متصفح */
export function getDeviceId(): string {
  let id = safeGet(DEVICE_KEY);
  if (!id) {
    id = uid();
    safeSet(DEVICE_KEY, id);
  }
  return id;
}

export interface RemotePull {
  enabled: boolean;
  conversations?: Conversation[];
  settings?: Partial<Settings>;
}

/** سحب البيانات من السحابة */
export async function pullRemote(): Promise<RemotePull> {
  try {
    const res = await fetch(`/api/conversations?deviceId=${encodeURIComponent(getDeviceId())}`, {
      cache: "no-store",
    });
    if (!res.ok) return { enabled: false };
    const j = await res.json();
    return {
      enabled: !!j.enabled,
      conversations: Array.isArray(j.conversations) ? j.conversations : undefined,
      settings: j.settings ?? undefined,
    };
  } catch {
    return { enabled: false };
  }
}

/** دفع الحالة الكاملة إلى السحابة (استبدال كامل — بسيط وآمن لجهاز واحد) */
export async function pushRemote(
  conversations: Conversation[],
  settings: Settings
): Promise<boolean> {
  try {
    const res = await fetch("/api/conversations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId(), conversations, settings }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** مسح بيانات هذا الجهاز من السحابة */
export async function clearRemote(): Promise<boolean> {
  try {
    const res = await fetch(`/api/conversations?deviceId=${encodeURIComponent(getDeviceId())}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** دمج محلي + سحابي: لكل محادثة يفوز الأحدث updatedAt، ويُحتفظ بالاتحاد */
export function mergeConversations(
  local: Conversation[],
  remote: Conversation[]
): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const c of remote) map.set(c.id, c);
  for (const c of local) {
    const existing = map.get(c.id);
    if (!existing || (c.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
      map.set(c.id, c);
    }
  }
  return [...map.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}
