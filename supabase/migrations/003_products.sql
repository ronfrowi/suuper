CREATE TABLE products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supermarket_id   uuid NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
  external_id      text NOT NULL,
  name             text NOT NULL,
  brand            text,
  unit             text,
  category         text NOT NULL,
  image_url        text,
  product_url      text NOT NULL,
  embedding        vector(1536),
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supermarket_id, external_id)
);

CREATE INDEX products_supermarket_idx ON products(supermarket_id);
CREATE INDEX products_embedding_idx   ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON products FOR SELECT USING (true);
