CREATE TABLE supermarkets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text UNIQUE NOT NULL,
  name       text NOT NULL,
  base_url   text NOT NULL,
  logo_url   text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE supermarkets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON supermarkets FOR SELECT USING (true);

INSERT INTO supermarkets (slug, name, base_url) VALUES
  ('walmart-cr',   'Walmart CR',    'https://www.walmart.co.cr'),
  ('mas-x-menos',  'Más x Menos',   'https://www.masxmenos.cr'),
  ('pricesmart',   'PriceSmart',    'https://www.pricesmart.com/es/costa-rica'),
  ('automercado',  'AutoMercado',   'https://www.automercado.co.cr'),
  ('fresh-market', 'Fresh Market',  'https://www.freshmarket.co.cr'),
  ('mega-super',   'Mega Super',    'https://www.megasuper.co.cr'),
  ('pali',         'Palí',          'https://www.pali.co.cr');
