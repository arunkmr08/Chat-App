import pdfParse from 'pdf-parse'

/**
 * File Parser Service
 *
 * Extracts text content from various file types:
 * - PDF (.pdf)
 * - Plain text (.txt, .md)
 * - Future: DOCX, images with OCR
 */

export interface ParsedFile {
  text: string
  metadata: {
    fileName: string
    fileType: string
    pageCount?: number
    author?: string
    title?: string
  }
}

/**
 * Parse a PDF file and extract text
 */
async function parsePDF(buffer: Buffer, fileName: string): Promise<ParsedFile> {
  try {
    const data = await pdfParse(buffer)

    return {
      text: data.text,
      metadata: {
        fileName,
        fileType: 'pdf',
        pageCount: data.numpages,
        author: data.info?.Author,
        title: data.info?.Title || fileName,
      },
    }
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error}`)
  }
}

/**
 * Parse a plain text file
 */
function parseText(buffer: Buffer, fileName: string): ParsedFile {
  return {
    text: buffer.toString('utf-8'),
    metadata: {
      fileName,
      fileType: 'text',
      title: fileName,
    },
  }
}

/**
 * Parse a file based on its extension
 */
export async function parseFile(buffer: Buffer, fileName: string): Promise<ParsedFile> {
  const extension = fileName.toLowerCase().split('.').pop()

  console.log(`[File Parser] Parsing ${fileName} (${extension})`)

  switch (extension) {
    case 'pdf':
      return parsePDF(buffer, fileName)

    case 'txt':
    case 'md':
    case 'markdown':
      return parseText(buffer, fileName)

    default:
      // Try parsing as text by default
      try {
        return parseText(buffer, fileName)
      } catch {
        throw new Error(`Unsupported file type: ${extension}`)
      }
  }
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return [
    'pdf',
    'txt',
    'md',
    'markdown',
    // Future: 'docx', 'doc', 'jpg', 'jpeg', 'png'
  ]
}

/**
 * Check if file type is supported
 */
export function isFileTypeSupported(fileName: string): boolean {
  const extension = fileName.toLowerCase().split('.').pop()
  return extension ? getSupportedExtensions().includes(extension) : false
}
