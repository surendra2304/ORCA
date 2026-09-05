// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdmZip = require('adm-zip');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { XMLParser } = require('fast-xml-parser');

export function parsePptxBuffer(buffer: Buffer): string {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // Find all slide XML files
    const slideEntries = zipEntries.filter((entry: any) =>
      entry.entryName.match(/^ppt\/slides\/slide\d+\.xml$/)
    );

    if (slideEntries.length === 0) {
      throw new Error('No slides found in the presentation.');
    }

    // Sort by slide number to maintain slide order
    slideEntries.sort((a: any, b: any) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
      const numB = parseInt(b.entryName.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
      return numA - numB;
    });

    const parser = new XMLParser({
      ignoreAttributes: true,
      parseTagValue: false,
    });

    const slidesText: string[] = [];

    let slideIndex = 1;
    for (const entry of slideEntries) {
      const xmlData = zip.readAsText(entry);
      const jsonObj = parser.parse(xmlData);

      const textBuffer: string[] = [];
      extractPPTXText(jsonObj, textBuffer);

      const slideTextContent = textBuffer.join(' ').replace(/\s+/g, ' ').trim();

      if (slideTextContent) {
        slidesText.push(`Slide ${slideIndex}:\n${slideTextContent}`);
      }
      slideIndex++;
    }

    if (slidesText.length === 0) {
      throw new Error('Presentation contains no extractable text.');
    }

    return slidesText.join('\n\n');
  } catch (err: any) {
    throw new Error(`Failed to parse PPTX file: ${err.message}`);
  }
}

/**
 * Recursively find text inside <a:t> nodes
 */
function extractPPTXText(obj: any, textBuffer: string[]) {
  if (typeof obj === 'string' || typeof obj === 'number') {
    return;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractPPTXText(item, textBuffer);
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'a:t' || key === 't') {
        if (typeof value === 'string' || typeof value === 'number') {
          textBuffer.push(String(value));
        } else if (typeof value === 'object' && value !== null) {
          extractPPTXText(value, textBuffer);
        }
      } else {
        extractPPTXText(value, textBuffer);
      }
    }
  }
}
