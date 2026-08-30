-- =====================================================================
--  نواة AI — مخطط قاعدة البيانات (Neon Postgres)
--  يُنشأ تلقائيًا عند أول مزامنة، لكن يمكنك تنفيذه يدويًا أيضًا:
--  Neon Console → SQL Editor → لصق هذا → Run
-- =====================================================================

CREATE TABLE IF NOT EXISTS nahwa_sync (
  device_id  TEXT PRIMARY KEY,          -- معرّف الجهاز/المتصفح (بدون حسابات بعد)
  data       TEXT NOT NULL,             -- JSON: {v:1, conversations:[...], settings:{...}}
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فهرس زمني اختياري للاستعلامات المستقبلية
CREATE INDEX IF NOT EXISTS idx_nahwa_sync_updated ON nahwa_sync (updated_at DESC);

-- =====================================================================
--  سجل هوية التطبيق (Application Identity Registry)
--  يقفل الفجوة بين OAuth Authentication و Application User Provisioning:
--  (provider, provider_account_id) → user_id → canonical application user
--  بحيث تكون session.user.id دائمًا هو معرّف المستخدم التطبيقي، وليس
--  معرّف مزود خارجي (Google sub / GitHub id). UNIQUE يمنع الازدواجية.
-- =====================================================================

CREATE TABLE IF NOT EXISTS nahwa_auth_identities (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES nahwa_users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,              -- 'google' | 'github'
  provider_account_id TEXT NOT NULL,              -- Google sub / GitHub id
  email_at_provider   TEXT,                       -- البريد كما ظهر عند المزود (وثوقية الربط)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_identity_per_provider UNIQUE (provider, provider_account_id)
);

-- فهرسة استعلامات الربط والعد
CREATE INDEX IF NOT EXISTS idx_nahwa_auth_identities_user ON nahwa_auth_identities (user_id);
