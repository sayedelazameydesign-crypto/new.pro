// ===== مزود Pollinations — صور بلا مفتاح وبلا بروكسي serverless =====
// الخادم يبني الرابط فقط؛ المتصفح يحمّل الصورة مباشرة من Pollinations.
// الطبقة المجانية ≈ طلب / 5 ثوانٍ — القاطع يعزل عند 429 إن رُصد.

import type { CircuitBreaker } from "../breaker";
import { providerBreaker } from "../breaker";

export const POLLINATIONS_ORIGIN = "https://image.pollinations.ai/prompt/";
export const IMAGE_SIZE_WHITELIST = [256, 512, 1024] as const;
export type ImageSize = (typeof IMAGE_SIZE_WHITELIST)[number];
export const DEFAULT_IMAGE_SIZE: ImageSize = 1024;

export function isAllowedImageSize(n: number): n is ImageSize {
  return n === 256 || n === 512 || n === 1024;
}

export function buildPollinationsUrl(opts: {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
}): string {
  const width = opts.width ?? DEFAULT_IMAGE_SIZE;
  const height = opts.height ?? DEFAULT_IMAGE_SIZE;
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const encoded = encodeURIComponent(opts.prompt.trim());
  return `${POLLINATIONS_ORIGIN}${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

export type PollinationsIssue =
  | { ok: true; url: string; width: number; height: number; seed: number; source: "pollinations" }
  | { ok: false; code: "CIRCUIT_OPEN" };

/** يبني الرابط بعد استشارة القاطع — بلا fetch لصورة (لا بروكسي) */
export function issuePollinationsImage(
  input: { prompt: string; width?: number; height?: number; seed?: number },
  breaker: CircuitBreaker = providerBreaker
): PollinationsIssue {
  if (!breaker.isAvailable("pollinations")) {
    return { ok: false, code: "CIRCUIT_OPEN" };
  }
  const width = input.width ?? DEFAULT_IMAGE_SIZE;
  const height = input.height ?? DEFAULT_IMAGE_SIZE;
  const seed = input.seed ?? Math.floor(Math.random() * 1_000_000_000);
  return {
    ok: true,
    url: buildPollinationsUrl({ prompt: input.prompt, width, height, seed }),
    width,
    height,
    seed,
    source: "pollinations",
  };
}

/** يسجّل 429/5xx من العميل أو فحص لاحق — يفتح دائرة pollinations */
export function notePollinationsFailure(
  status: number,
  breaker: CircuitBreaker = providerBreaker
): void {
  breaker.recordFailure("pollinations", { status });
}
