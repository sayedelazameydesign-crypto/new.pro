// ===== قاطع دائرة المزودات — وحدة معزولة قابلة للاختبار =====
// يفتح عند 429 / 5xx / شبكة-مهلة. لا يفتح عند 400/401/403/404 (تهيئة لا تشفى بالانتظار).
// الحالات: closed → open (10 د) → half-open (استكشاف واحد) → closed أو إعادة فتح.
// now اختياري في كل دالة — وقت وهمي في node:test بلا setTimeout.

export type BreakerState = "closed" | "open" | "half-open";

export interface BreakerSnapshot {
  state: BreakerState;
  failures: number;
  openedAt: number | null;
}

export const BREAKER_OPEN_MS = 10 * 60 * 1000;

const CONFIG_STATUS = new Set([400, 401, 403, 404]);

export function isConfigStatus(status: number | undefined): boolean {
  return typeof status === "number" && CONFIG_STATUS.has(status);
}

export function isTransientStatus(status: number | undefined, network = false): boolean {
  if (network) return true;
  if (typeof status !== "number") return false;
  return status === 429 || status >= 500;
}

/** يستخرج كود HTTP من رسائل المزودات: `Groq (429): ...` */
export function extractHttpStatus(err: unknown): number | undefined {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.match(/\((\d{3})\)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /fetch failed|network|timeout|ECONN|ENOTFOUND|ETIMEDOUT|AbortError|TypeError/i.test(msg);
}

export function failureKindFromError(err: unknown): "transient" | "config" {
  const status = extractHttpStatus(err);
  if (isConfigStatus(status)) return "config";
  if (isTransientStatus(status, false)) return "transient";
  if (isNetworkError(err)) return "transient";
  return "transient";
}

interface Entry {
  state: BreakerState;
  failures: number;
  openedAt: number;
  probeLock: boolean;
}

export interface CircuitBreaker {
  /** true إن لم تكن الدائرة مفتوحة — لا يحجز طلب الاستكشاف */
  peekAvailable(id: string, now?: number): boolean;
  /** true مع حجز استكشاف half-open (طلب واحد) */
  isAvailable(id: string, now?: number): boolean;
  recordFailure(id: string, info?: { status?: number; network?: boolean }, now?: number): void;
  recordSuccess(id: string, now?: number): void;
  snapshot(id?: string, now?: number): BreakerSnapshot | Record<string, BreakerSnapshot>;
  reset(): void;
}

export function createBreaker(opts?: { now?: () => number; openMs?: number }): CircuitBreaker {
  const clock = opts?.now ?? Date.now;
  const openMs = opts?.openMs ?? BREAKER_OPEN_MS;
  const map = new Map<string, Entry>();

  const get = (id: string): Entry => map.get(id) ?? { state: "closed", failures: 0, openedAt: 0, probeLock: false };

  const set = (id: string, e: Entry) => {
    map.set(id, e);
  };

  const maybeExpire = (id: string, t: number): Entry => {
    const e = get(id);
    if (e.state === "open" && t - e.openedAt >= openMs) {
      const next: Entry = { ...e, state: "half-open", probeLock: false };
      set(id, next);
      return next;
    }
    return e;
  };

  const view = (id: string, t: number): BreakerSnapshot => {
    const e = maybeExpire(id, t);
    return {
      state: e.state,
      failures: e.failures,
      openedAt: e.state === "closed" ? null : e.openedAt,
    };
  };

  return {
    peekAvailable(id: string, now?: number): boolean {
      const t = now ?? clock();
      const e = maybeExpire(id, t);
      if (e.state === "open") return false;
      if (e.state === "half-open" && e.probeLock) return false;
      return true;
    },

    isAvailable(id: string, now?: number): boolean {
      const t = now ?? clock();
      const e = maybeExpire(id, t);
      if (e.state === "closed") return true;
      if (e.state === "open") return false;
      // half-open: طلب استكشاف واحد فقط
      if (e.probeLock) return false;
      set(id, { ...e, probeLock: true });
      return true;
    },

    recordFailure(id: string, info?: { status?: number; network?: boolean }, now?: number): void {
      // 400/401/403/404: تهيئة — لا عزل
      if (isConfigStatus(info?.status)) return;
      if (
        info &&
        typeof info.status === "number" &&
        !isTransientStatus(info.status, !!info.network) &&
        !info.network
      ) {
        return;
      }
      const t = now ?? clock();
      const prev = get(id);
      set(id, {
        state: "open",
        failures: prev.failures + 1,
        openedAt: t,
        probeLock: false,
      });
    },

    recordSuccess(id: string): void {
      set(id, { state: "closed", failures: 0, openedAt: 0, probeLock: false });
    },

    snapshot(id?: string, now?: number): BreakerSnapshot | Record<string, BreakerSnapshot> {
      const t = now ?? clock();
      if (id) return view(id, t);
      const known = ["groq", "github", "gemini", "huggingface"];
      const ids = new Set([...known, ...map.keys()]);
      const out: Record<string, BreakerSnapshot> = {};
      for (const k of ids) out[k] = view(k, t);
      return out;
    },

    reset(): void {
      map.clear();
    },
  };
}

/** قاطع الإنتاج — ذاكرة العملية (مثل حدّ الطلبات بلا Upstash) */
export const providerBreaker = createBreaker();
