-- pgvector RPC for nearest-neighbour product search across supermarkets
CREATE OR REPLACE FUNCTION match_products(
  query_embedding    vector(1536),
  source_supermarket_id uuid,
  match_threshold    float,
  match_count        int
)
RETURNS TABLE (id uuid, similarity float)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE
    p.supermarket_id <> source_supermarket_id
    AND p.embedding IS NOT NULL
    AND p.active = true
    AND 1 - (p.embedding <=> query_embedding) >= match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
