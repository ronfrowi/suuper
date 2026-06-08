CREATE TABLE scrape_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supermarket_id    uuid NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at        timestamptz,
  completed_at      timestamptz,
  products_scraped  integer NOT NULL DEFAULT 0,
  errors            jsonb NOT NULL DEFAULT '[]',
  triggered_by      text NOT NULL CHECK (triggered_by IN ('cron', 'manual')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX scrape_jobs_supermarket_idx ON scrape_jobs(supermarket_id);
CREATE INDEX scrape_jobs_status_idx      ON scrape_jobs(status);
CREATE INDEX scrape_jobs_created_at_idx  ON scrape_jobs(created_at DESC);

ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read" ON scrape_jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
