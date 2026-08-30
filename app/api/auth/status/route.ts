// ===== GET /api/auth/status — هل الحسابات مفعّلة؟ من هو المستخدم؟ وما المزودات الاجتماعية؟ =====

import { auth, authEnabled, socialProviders } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!authEnabled()) {
    return Response.json({ enabled: false, user: null, providers: { github: false, google: false } });
  }
  const session = await auth();
  const u = session?.user;
  return Response.json({
    enabled: true,
    user: u ? { id: u.id, email: u.email, name: u.name ?? undefined } : null,
    providers: socialProviders(),
  });
}
