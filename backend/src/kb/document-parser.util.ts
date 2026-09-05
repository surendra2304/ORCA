import { Logger } from '@nestjs/common';
import * as pdf from 'pdf-parse';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { parsePptxBuffer } from './pptx-parser.util';

const logger = new Logger('DocumentParserUtil');

/**
 * Plain-text file extensions that can safely be decoded as UTF-8.
 */
const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.tsv',
  '.json',
  '.xml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.ts',
  '.yaml',
  '.yml',
  '.log',
  '.rtf',
]);

const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

/**
 * Universal text sanitizer: removes binary noise, control characters,
 * and collapses whitespace deterministically without fragile regexes.
 */
export function sanitizeExtractedText(text: string): string {
  if (!text) return '';

  // 1. Remove non-printable control characters & null bytes using character codes
  let clean = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Keep printable ASCII (32-126), standard newlines (10, 13), tabs (9), and valid Unicode (> 127)
    if (
      code === 10 ||
      code === 13 ||
      code === 9 ||
      (code >= 32 && code <= 126) ||
      (code >= 160 && code !== 65279 && code !== 65533)
    ) {
      clean += text[i];
    } else {
      clean += ' ';
    }
  }

  // 2. Normalize whitespace and empty lines deterministically
  const lines = clean
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');
  const cleanLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine
      .split(/\s+/)
      .filter(Boolean)
      .join(' ');
    if (line.length > 0) {
      cleanLines.push(line);
    } else if (
      cleanLines.length > 0 &&
      cleanLines[cleanLines.length - 1] !== ''
    ) {
      cleanLines.push('');
    }
  }

  return cleanLines.join('\n').trim();
}

/**
 * Clean HTML and Web page content into readable narrative text using
 * a deterministic state-machine tag parser without regex backtracking.
 */
export function cleanHtmlContent(html: string): string {
  if (!html) return '';

  let text = '';
  let inTag = false;
  let inScriptOrStyle = false;
  let currentTag = '';

  for (let i = 0; i < html.length; i++) {
    const char = html[i];

    if (char === '<') {
      inTag = true;
      currentTag = '';
      continue;
    }

    if (inTag) {
      if (char === '>') {
        inTag = false;
        const tagLower = currentTag.trim().toLowerCase();
        if (
          tagLower === 'script' ||
          tagLower.startsWith('script ') ||
          tagLower === 'style' ||
          tagLower.startsWith('style ') ||
          tagLower === 'noscript'
        ) {
          inScriptOrStyle = true;
        } else if (
          tagLower === '/script' ||
          tagLower === '/style' ||
          tagLower === '/noscript'
        ) {
          inScriptOrStyle = false;
        } else if (
          tagLower === 'br' ||
          tagLower === 'br/' ||
          tagLower === 'br /' ||
          tagLower === '/p' ||
          tagLower === '/div' ||
          tagLower === '/h1' ||
          tagLower === '/h2' ||
          tagLower === '/h3' ||
          tagLower === '/h4' ||
          tagLower === '/h5' ||
          tagLower === '/h6' ||
          tagLower === '/tr'
        ) {
          text += '\n';
        } else if (tagLower === 'li') {
          text += '\n• ';
        } else if (tagLower === '/td' || tagLower === '/th') {
          text += ' | ';
        }
      } else {
        currentTag += char;
      }
      continue;
    }

    if (!inScriptOrStyle) {
      text += char;
    }
  }

  // Decode common HTML entities
  for (const [entity, replacement] of Object.entries(HTML_ENTITIES)) {
    text = text.split(entity).join(replacement);
  }

  return sanitizeExtractedText(text);
}

/**
 * Structured Markdown Parser: preserves heading hierarchy as context prefixes.
 */
export function parseMarkdownStructured(mdText: string): string {
  if (!mdText) return '';
  const lines = mdText.split(/\r?\n/);
  const blocks: string[] = [];
  const headingStack: { level: number; text: string }[] = [];
  let currentParagraph: string[] = [];

  const flush = () => {
    if (currentParagraph.length > 0) {
      const prefix = headingStack.map((h) => h.text).join(' > ');
      const content = currentParagraph.join(' ').trim();
      if (content) blocks.push(prefix ? `${prefix}: ${content}` : content);
      currentParagraph = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }

    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flush();
      const level = headerMatch[1].length;
      const title = headerMatch[2].replace(/[*_`#]/g, '').trim();
      while (
        headingStack.length > 0 &&
        headingStack[headingStack.length - 1].level >= level
      ) {
        headingStack.pop();
      }
      headingStack.push({ level, text: title });
      continue;
    }

    const cleanLine = line
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/(\*\*|__|\*|_|`)(.*?)\1/g, '$2')
      .trim();

    if (cleanLine) currentParagraph.push(cleanLine);
  }

  flush();
  return sanitizeExtractedText(blocks.join('\n\n'));
}

/**
 * Determines the document category from a filename (case-insensitive).
 */
export function classifyFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.pdf') return 'PDF';
  if (ext === '.pptx' || ext === '.pptm') return 'PPTX';
  if (ext === '.docx' || ext === '.docm') return 'DOCX';
  if (ext === '.doc') return 'DOC';
  if (ext === '.xlsx' || ext === '.xlsm' || ext === '.xls') return 'XLSX';
  if (ext === '.csv' || ext === '.tsv') return 'CSV';
  if (ext === '.md' || ext === '.markdown') return 'MD';
  if (ext === '.html' || ext === '.htm') return 'HTML';
  if (TEXT_EXTENSIONS.has(ext)) return 'TXT';
  if (ext === '.ppt') return 'UNSUPPORTED_LEGACY';
  return 'UNSUPPORTED';
}

/**
 * Central document parser.
 * Accepts a raw file Buffer and filename, returns extracted plain text.
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const type = classifyFileType(filename);
  return parseFileBuffer(buffer, type, filename);
}

/**
 * Robust document parser for all supported formats:
 * PDF, DOCX, DOC, PPTX, XLSX, XLS, CSV, RTF, HTML, MD, TXT
 */
export async function parseFileBuffer(
  buffer: Buffer,
  type: string,
  filename: string,
): Promise<string> {
  const normType = (type || '').toUpperCase();
  const ext = (path.extname(filename) || '').toLowerCase().replace('.', '');

  try {
    // 1. PDF Documents
    if (normType === 'PDF' || ext === 'pdf') {
      let rawText = '';
      if (pdf && (pdf as any).PDFParse) {
        const PDFParseClass = (pdf as any).PDFParse;
        const parser = new PDFParseClass(
          new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
        );
        const parsed = await parser.getText();
        rawText = parsed.text;
      } else {
        const parseFn =
          typeof pdf === 'function' ? (pdf as any) : (pdf as any).default;
        if (typeof parseFn !== 'function')
          throw new Error('PDF parser not initialized');
        const parsed = await parseFn(buffer);
        rawText = parsed.text;
      }
      return validateText(sanitizeExtractedText(rawText), 'PDF');
    }

    // 2. DOCX Documents
    if (normType === 'DOCX' || ext === 'docx' || ext === 'docm') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mammoth = require('mammoth');
      const res = await mammoth.extractRawText({ buffer });
      return validateText(sanitizeExtractedText(res.value), 'DOCX');
    }

    // 3. Legacy DOC Documents
    if (normType === 'DOC' || ext === 'doc') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const WordExtractor = require('word-extractor');
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      const body = extracted.getBody() || '';
      return validateText(sanitizeExtractedText(body), 'DOC');
    }

    // 4. PPTX Presentations
    if (normType === 'PPTX' || ext === 'pptx' || ext === 'pptm') {
      const text = parsePptxBuffer(buffer);
      return validateText(sanitizeExtractedText(text), 'PPTX');
    }

    if (ext === 'ppt' || normType === 'PPT') {
      throw new Error(
        'Legacy format ".ppt" is not supported. Please convert to .pptx and re-upload.',
      );
    }

    // 5. XLSX / XLS / CSV Spreadsheets
    if (
      normType === 'XLSX' ||
      normType === 'XLS' ||
      normType === 'CSV' ||
      ['xlsx', 'xlsm', 'xls', 'csv', 'tsv'].includes(ext)
    ) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetTexts: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
        });
        if (!rows || rows.length === 0) continue;

        const rawHeaders = rows[0].map((h: any) => String(h || '').trim());
        const headers = rawHeaders.map((h: string, idx: number) => {
          const lowerH = h.toLowerCase();
          if (
            !h ||
            lowerH === '0' ||
            lowerH === 'index' ||
            lowerH === 's.no' ||
            lowerH === 'sr no' ||
            lowerH === 'sno'
          ) {
            return idx === 0 ? 'ID' : `Column ${idx + 1}`;
          }
          if (lowerH === 'id') return 'Record ID';
          return h;
        });

        const rowTexts: string[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const entries: string[] = [];
          for (let j = 0; j < row.length; j++) {
            const val = String(row[j] || '').trim();
            if (val) {
              const label = headers[j] || `Field ${j + 1}`;
              entries.push(`${label}: ${val}`);
            }
          }
          if (entries.length > 0) rowTexts.push(entries.join('\n'));
        }

        if (rowTexts.length > 0) {
          sheetTexts.push(`Sheet: ${sheetName}\n${rowTexts.join('\n\n')}`);
        }
      }

      const text =
        sheetTexts.length > 0
          ? sheetTexts.join('\n\n')
          : buffer.toString('utf-8');
      return validateText(sanitizeExtractedText(text), 'XLSX');
    }

    // 6. Markdown
    if (normType === 'MD' || ext === 'md' || ext === 'markdown') {
      return validateText(
        parseMarkdownStructured(buffer.toString('utf-8')),
        'MD',
      );
    }

    // 7. HTML
    if (normType === 'HTML' || ['html', 'htm'].includes(ext)) {
      return validateText(cleanHtmlContent(buffer.toString('utf-8')), 'HTML');
    }

    // 8. Plain Text & Others
    let text = buffer.toString('utf-8');
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }
    return validateText(sanitizeExtractedText(text), 'TXT');
  } catch (err: any) {
    logger.error(`Failed to parse file ${filename} (${type}):`, err);
    throw new Error(
      `Failed to extract text from file "${filename}": ${err?.message || 'Unsupported or corrupted format'}`,
    );
  }
}

function validateText(text: string, formatLabel: string): string {
  if (!text) {
    throw new Error(`${formatLabel} document is empty or text extraction failed.`);
  }
  const clean = text.replace(/\0/g, '').trim();
  if (!clean) {
    throw new Error(
      `${formatLabel} document contains no extractable text content.`,
    );
  }
  return clean;
}
