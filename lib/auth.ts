// ===== إعداد المصادقة (Auth.js v5) =====
// جاهز فورًا: بريد + كلمة مرور (تُخزَّن مجزأةً في Neon — scrypt).
// ترقية: أضف AUTH_GITHUB_ID/SECRET أو AUTH_GOOGLE_ID/SECRET → تظهر أزرار الدخول الاجتماعي تلقائيًا.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { findUserByEmail, verifyPassword } from "./auth-db";
import { ensureApplicationUser } from "./identity";
import { checkRateLimit, getClientIp } from "./rate-limit";

/** هل المصادقة جاهزة؟ (يتطلب AUTH_SECRET + قاعدة البيانات) */
export const authEnabled = () => !!process.env.AUTH_SECRET && !!process.env.DATABASE_URL;

/** المزودات الاجتماعية المفعّلة (تظهر كأزرار في واجهة الدخول) */
export const socialProviders = () => ({
  github: !!process.env.AUTH_GITHUB_ID && !!process.env.AUTH_GITHUB_SECRET,
  google: !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        // حماية من محاولات الدخول المتكررة (10/دقيقة/IP)
        const ip = getClientIp(request as Request);
        const rl = await checkRateLimit("auth", ip, 10);
        if (!rl.ok) throw new Error("RATE_LIMITED");

        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user) return null;
        const ok = await verifyPassword(password, user.password_hash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name || undefined };
      },
    }),
    // يُضاف فقط عند تهيئة OAuth (اختياري — لا يمنع عمل البريد/كلمة المرور)
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET })]
      : []),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
      : []),
  ],
  callbacks: {
    // Provisioning إلزامي داخل دورة توقيع الجلسة نفسها (وليس side effect):
    // OAuth identity → canonical application user → session.user.id
    async jwt({ token, user, account }) {
      try {
        if (account && account.provider !== "credentials") {
          const pid = String(account.providerAccountId ?? "").trim();
          if (!pid) throw new Error("IDENTITY_INVALID: providerAccountId مفقود");
          const res = await ensureApplicationUser({
            provider: account.provider as "google" | "github",
            providerAccountId: pid,
            email: user?.email ?? undefined,
            name: user?.name ?? undefined,
            image: user?.image ?? undefined,
          });
          token.id = res.userId; // canonical application user ID (ليس معرّف المزود)
        } else if (user?.id) {
          token.id = user.id; // credentials: id مصدره nahwa_users أصلًا
        }
      } catch (err) {
        // لا جلسة بلا مستخدم تطبيقي (INVARIANT-01) — نرفض التوقيع
        console.warn("[nawah][identity][error]", err instanceof Error ? err.message.slice(0, 160) : "unknown");
        throw err;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
});
