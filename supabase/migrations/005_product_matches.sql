CREATE TABLE product_matches (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  matched_product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  similarity_score     numeric(5,4) NOT NULL,
  match_method         text NOT NULL CHECK (match_method IN ('embedding', 'barcode', 'manual')),
  confirmed            boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (canonical_product_id, matched_product_id)
);

CREATE INDEX product_matches_canonical_idx ON product_matches(canonical_product_id);
CREATE INDEX product_matches_confirmed_idx ON product_matches(confirmed) WHERE confirmed = false;

ALTER TABLE product_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON product_matches FOR SELECT USING (true);
