CREATE TABLE IF NOT EXISTS db_monitor_samples (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  environment TEXT NOT NULL,
  route TEXT NOT NULL,
  sample_rate DOUBLE PRECISION NOT NULL CHECK (sample_rate > 0 AND sample_rate <= 1),
  failed BOOLEAN NOT NULL,
  operations JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS db_monitor_samples_recorded_at_idx ON db_monitor_samples(recorded_at);

CREATE TABLE IF NOT EXISTS db_monitor_neon_cache (
  cache_key TEXT PRIMARY KEY,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL
);
