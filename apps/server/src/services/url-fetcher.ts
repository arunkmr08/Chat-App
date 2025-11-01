import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

export interface FetchedContent {
  title: string
  content: string
  excerpt: string
  url: string
  siteName?: string
  author?: string
  publishedTime?: string
}

/**
 * Fetch and extract main content from a URL using Mozilla Readability
 */
export async function fetchUrlContent(url: string): Promise<FetchedContent> {
  try {
    // Validate URL
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP/HTTPS URLs are supported')
    }

    // Fetch HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ZoAI-Bot/1.0; +https://zoai.app)',
      },
      redirect: 'follow',
      timeout: 15000,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    // Parse with JSDOM
    const dom = new JSDOM(html, { url })

    // Extract with Readability
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article) {
      throw new Error('Failed to extract article content - page may not be readable')
    }

    // Clean up HTML tags from content
    const textContent = cleanHtml(article.textContent)

    return {
      title: article.title || 'Untitled',
      content: textContent,
      excerpt: article.excerpt || textContent.slice(0, 200),
      url,
      siteName: article.siteName,
      author: article.byline,
      publishedTime: extractPublishedTime(dom.window.document),
    }
  } catch (error) {
    console.error('Error fetching URL:', url, error)
    throw error
  }
}

/**
 * Clean HTML tags and excessive whitespace
 */
function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
    .trim()
}

/**
 * Try to extract published time from meta tags
 */
function extractPublishedTime(doc: Document): string | undefined {
  const metaSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="publishdate"]',
    'meta[name="date"]',
    'time[datetime]',
  ]

  for (const selector of metaSelectors) {
    const element = doc.querySelector(selector)
    if (element) {
      const content =
        element.getAttribute('content') || element.getAttribute('datetime')
      if (content) return content
    }
  }

  return undefined
}

/**
 * Validate if URL is accessible and readable
 */
export async function validateUrl(url: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false
    }

    const response = await fetch(url, {
      method: 'HEAD',
      timeout: 5000,
    })

    return response.ok
  } catch {
    return false
  }
}
