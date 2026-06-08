/**
 * Fresh Market (freshmarket.co.cr) scraper.
 * WordPress + WooCommerce — static HTML, Cheerio + axios, no Playwright needed.
 *
 * Catalog: https://www.freshmarket.co.cr/tienda/?page=N
 * Product listing card selectors verified against live site (June 2026).
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import type { RawProduct } from '../types'

const BASE_URL = 'https://www.freshmarket.co.cr'
const CATALOG_URL = `${BASE_URL}/tienda/`

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const randomDelay = () => delay(1500 + Math.random() * 2000)

const httpClient = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; SuuperBot/1.0)',
    Accept: 'text/html,application/xhtml+xml',
  },
  timeout: 20000,
})

function parseCRC(text: string): number {
  // Handles formats like "₡1.250,00" or "1250.00" or "1,250"
  const cleaned = text.replace(/[₡\s]/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

async function scrapePage(pageUrl: string): Promise<RawProduct[]> {
  const { data: html } = await httpClient.get<string>(pageUrl)
  const $ = cheerio.load(html)
  const products: RawProduct[] = []

  $('ul.products li.product').each((_, el) => {
    const $el = $(el)

    // Product URL & name
    const productUrl = $el.find('a.woocommerce-LoopProduct-link').attr('href') ?? ''
    const name = $el.find('.woocommerce-loop-product__title').text().trim()
    if (!name || !productUrl) return

    // External ID — WooCommerce adds data-product_id on the add-to-cart button
    const external_id =
      $el.find('[data-product_id]').attr('data-product_id') ??
      productUrl.split('/').filter(Boolean).pop() ??
      name

    // Price — <ins> is sale price, <del> is original; if no <ins>, the single .amount is current
    const $priceEl = $el.find('.price')
    const insPrice = $priceEl.find('ins .amount').first().text().trim()
    const delPrice = $priceEl.find('del .amount').first().text().trim()
    const singlePrice = $priceEl.find('.amount').first().text().trim()

    const price = parseCRC(insPrice || singlePrice)
    const original_price = delPrice ? parseCRC(delPrice) : null
    if (price === 0) return

    // Image
    const image_url = $el.find('img.attachment-woocommerce_thumbnail').attr('src') ?? null

    // Category — not on listing card; default to 'General', filled in detail scrape if needed
    const category = 'General'

    products.push({
      external_id: String(external_id),
      name,
      brand: null, // not available on listing cards; detail page has it if needed
      price,
      original_price,
      currency: 'CRC',
      unit: null, // extracted by normalize.ts from product name
      category,
      image_url,
      product_url: productUrl,
      available: !$el.hasClass('outofstock'),
      scraped_at: new Date().toISOString(),
    })
  })

  return products
}

function getNextPageUrl(html: string, $: cheerio.CheerioAPI): string | null {
  const next = $('a.next.page-numbers').attr('href')
  return next ?? null
}

async function fetchAllPages(startUrl: string): Promise<RawProduct[]> {
  const allProducts: RawProduct[] = []
  let url: string | null = startUrl

  while (url) {
    await randomDelay()
    const { data: html } = await httpClient.get<string>(url)
    const $ = cheerio.load(html)

    const pageProducts = await scrapePage(url)
    allProducts.push(...pageProducts)

    url = getNextPageUrl(html, $)
  }

  return allProducts
}

export async function scrapeAll(): Promise<RawProduct[]> {
  return fetchAllPages(CATALOG_URL)
}

export async function scrapeCategory(categoryUrl: string): Promise<RawProduct[]> {
  // WooCommerce category URLs: /product-category/<slug>/
  return fetchAllPages(categoryUrl)
}

export async function scrapeProduct(productUrl: string): Promise<RawProduct> {
  await randomDelay()
  const { data: html } = await httpClient.get<string>(productUrl)
  const $ = cheerio.load(html)

  const name = $('h1.product_title').text().trim()
  if (!name) throw new Error(`Product name not found: ${productUrl}`)

  const external_id =
    ($('[data-product_id]').first().attr('data-product_id') ??
    $('input[name="product_id"]').attr('value') ??
    $('.product_meta .sku').text().trim()) ||
    productUrl.split('/').filter(Boolean).pop()!

  const brand = $('.product_meta').find('span:contains("Marca")').next().text().trim() || null
  const category =
    $('.posted_in a').first().text().trim() ||
    $('.product_meta').find('span:contains("Categoría")').next().text().trim() ||
    'General'

  const $price = $('.summary .price')
  const insPrice = $price.find('ins .amount').first().text().trim()
  const delPrice = $price.find('del .amount').first().text().trim()
  const singlePrice = $price.find('.amount').first().text().trim()

  const price = parseCRC(insPrice || singlePrice)
  const original_price = delPrice ? parseCRC(delPrice) : null

  const image_url = $('.woocommerce-product-gallery__image img').first().attr('src') ?? null
  const available = !$('.stock.out-of-stock').length

  return {
    external_id: String(external_id),
    name,
    brand,
    price,
    original_price,
    currency: 'CRC',
    unit: null,
    category,
    image_url,
    product_url: productUrl,
    available,
    scraped_at: new Date().toISOString(),
  }
}
