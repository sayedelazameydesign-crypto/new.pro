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
