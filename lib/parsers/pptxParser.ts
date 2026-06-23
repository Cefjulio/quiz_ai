// eslint-disable-next-line @typescript-eslint/no-require-imports
const officeParser = require("officeparser");

export async function parsePptx(buffer: Buffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    officeParser.parseOffice(buffer, (text: string, err: Error) => {
      if (err) {
        reject(err);
        return;
      }
      const slides = text
        .split(/\n{3,}/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 10);
      resolve(slides.length > 0 ? slides : [text.trim()]);
    }, { outputErrorToConsole: false });
  });
}
