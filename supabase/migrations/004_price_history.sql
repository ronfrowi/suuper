CREATE TABLE price_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price          numeric(10,2) NOT NULL,
  original_price numeric(10,2),
  available      boolean NOT NULL,
  scraped_at     timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX price_history_product_idx    ON price_history(product_id);
CREATE INDEX price_history_scraped_at_idx ON price_history(scraped_at DESC);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON price_history FOR SELECT USING (true);
