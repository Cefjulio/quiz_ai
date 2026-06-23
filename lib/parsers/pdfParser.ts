// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export async function parsePdf(buffer: Buffer): Promise<string[]> {
  const data = await pdfParse(buffer);
  // Split by form feed (page break) or double newline blocks
  const rawPages = data.text.split(/\f/);
  const pages = rawPages
    .map((p) => p.trim())
    .filter((p) => p.length > 20);
  return pages.length > 0 ? pages : [data.text.trim()];
}
