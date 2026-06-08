/**
 * Groups products into comparison rows.
 *
 * Strategy (in priority order):
 * 1. Confirmed product_matches — cluster all products connected by match edges
 *    into a single group. A product can only belong to one group.
 * 2. Name+unit fallback — products not reached by any match edge are grouped
 *    by normalized `name|unit` string, exactly as before.
 *
 * This means the table immediately works with zero match data (pure name
 * matching) and silently upgrades to match-based grouping as the admin
 * confirms matches.
 */

export interface ProductRow {
  id: string
  name: string
  brand: string | null
  unit: string | null
  category: string
  image_url: string | null
  product_url: string
  supermarket_id: string
  supermarkets: { id: string; slug: string; name: string }
  price_history: Array<{
    price: number
    original_price: number | null
    available: boolean
    scraped_at: string
  }>
}

export interface MatchEdge {
  canonical_product_id: string
  matched_product_id: string
}

export interface ProductGroup {
  /** Stable key for React rendering */
  key: string
  /** Display name — taken from the most common name in the group */
  name: string
  unit: string | null
  image_url: string | null
  /** canonical product id — used for "View detail" link */
  representativeId: string
  /** Map from supermarket slug → product (latest price_history[0]) */
  byStore: Map<string, ProductRow>
  /** Whether this group was formed via confirmed matches or name-fallback */
  matchBased: boolean
}

/** Union-Find for clustering match edges. */
class UnionFind {
  private parent = new Map<string, string>()

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x)
    const p = this.parent.get(x)!
    if (p !== x) this.parent.set(x, this.find(p))
    return this.parent.get(x)!
  }

  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

export function buildProductGroups(
  products: ProductRow[],
  matches: MatchEdge[]
): ProductGroup[] {
  // ── Step 1: Build match clusters via Union-Find ─────────────────────────
  const uf = new UnionFind()
  for (const { canonical_product_id, matched_product_id } of matches) {
    uf.union(canonical_product_id, matched_product_id)
  }

  // Identify which product ids are reachable from at least one match edge
  const matchedIds = new Set<string>()
  for (const { canonical_product_id, matched_product_id } of matches) {
    matchedIds.add(canonical_product_id)
    matchedIds.add(matched_product_id)
  }

  // ── Step 2: Partition products ───────────────────────────────────────────
  const matchGroups = new Map<string, ProductRow[]>()   // root → products
  const unmatchedByName = new Map<string, ProductRow[]>() // name|unit → products

  for (const product of products) {
    if (matchedIds.has(product.id)) {
      const root = uf.find(product.id)
      if (!matchGroups.has(root)) matchGroups.set(root, [])
      matchGroups.get(root)!.push(product)
    } else {
      const key = `${product.name.toLowerCase().trim()}|${product.unit ?? ''}`
      if (!unmatchedByName.has(key)) unmatchedByName.set(key, [])
      unmatchedByName.get(key)!.push(product)
    }
  }

  // ── Step 3: Build ProductGroup objects ──────────────────────────────────
  const groups: ProductGroup[] = []

  function buildGroup(members: ProductRow[], matchBased: boolean): ProductGroup {
    // Pick representative name (most frequent, or first alphabetically)
    const nameCounts = new Map<string, number>()
    for (const p of members) nameCounts.set(p.name, (nameCounts.get(p.name) ?? 0) + 1)
    const name = [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]

    // Pick image from first member that has one
    const image_url = members.find(p => p.image_url)?.image_url ?? null

    // Prefer the unit from the member with the most price_history
    const unit = members.find(p => p.unit)?.unit ?? null

    // One entry per store slug (latest price_history[0] already limited by query)
    const byStore = new Map<string, ProductRow>()
    for (const p of members) {
      const slug = p.supermarkets.slug
      // If two products from the same store ended up in the same match cluster,
      // keep the one with the more recent scraped_at
      const existing = byStore.get(slug)
      const existingTs = existing?.price_history[0]?.scraped_at ?? ''
      const candidateTs = p.price_history[0]?.scraped_at ?? ''
      if (!existing || candidateTs > existingTs) byStore.set(slug, p)
    }

    const representativeId =
      members.find(p => matchBased)?.id ?? members[0].id

    return {
      key: matchBased
        ? `match:${representativeId}`
        : `name:${name}|${unit ?? ''}`,
      name,
      unit,
      image_url,
      representativeId,
      byStore,
      matchBased,
    }
  }

  for (const members of matchGroups.values()) {
    groups.push(buildGroup(members, true))
  }
  for (const members of unmatchedByName.values()) {
    groups.push(buildGroup(members, false))
  }

  // Sort: match-based groups first, then alphabetically by name
  groups.sort((a, b) => {
    if (a.matchBased !== b.matchBased) return a.matchBased ? -1 : 1
    return a.name.localeCompare(b.name, 'es')
  })

  return groups
}
