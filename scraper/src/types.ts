export interface RawProduct {
  external_id: string
  name: string
  brand: string | null
  price: number
  original_price: number | null
  currency: 'CRC'
  unit: string | null
  category: string
  image_url: string | null
  product_url: string
  available: boolean
  scraped_at: string // ISO timestamp
}

export interface ScraperModule {
  scrapeAll(): Promise<RawProduct[]>
  scrapeCategory(categoryUrl: string): Promise<RawProduct[]>
  scrapeProduct(productUrl: string): Promise<RawProduct>
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'
export type TriggerSource = 'cron' | 'manual'

export interface JobRecord {
  id: string
  supermarket_id: string
  status: JobStatus
  started_at: string | null
  completed_at: string | null
  products_scraped: number
  errors: string[]
  triggered_by: TriggerSource
  created_at: string
}
