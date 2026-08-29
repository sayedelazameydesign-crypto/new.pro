// ===== إعداد المصادقة (Auth.js v5) =====
// جاهز فورًا: بريد + كلمة مرور (تُخزَّن مجزأةً في Neon — scrypt).
// ترقية اختيارية: أضف GITHUB_ID + GITHUB_SECRET → يظهر زر الدخول بـ GitHub تلقائيًا.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { findUserByEmail, verifyPassword } from "./auth-db";
import { checkRateLimit, getClientIp } from "./rate-limit";

/** هل المصادقة جاهزة؟ (يتطلب AUTH_SECRET + قاعدة البيانات) */
export const authEnabled = () => !!process.env.AUTH_SECRET && !!process.env.DATABASE_URL;

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
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
});
