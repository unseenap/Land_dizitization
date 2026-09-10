import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

export async function samplePdf(pages = 2) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText("SYNTHETIC TEST DOCUMENT", {
      x: 48,
      y: 770,
      size: 23,
      font,
      color: rgb(0.08, 0.22, 0.26),
    });
    page.drawText(`Sample record / page ${i + 1}`, {
      x: 48,
      y: 724,
      size: 15,
      font,
    });
    page.drawText("Fictional data. Not a legal or government record.", {
      x: 48,
      y: 682,
      size: 11,
      font,
    });
    page.drawText("Owner: Demo Person     Survey: SYN-001", {
      x: 48,
      y: 630,
      size: 13,
      font,
    });
    page.drawText("Village: Synthetic NORTH Village", {
      x: 48,
      y: 592,
      size: 13,
      font,
    });
  }
  return Buffer.from(await doc.save());
}
export async function sampleImage(format: "png" | "jpeg" | "tiff" = "png") {
  return sharp(
    Buffer.from(
      '<svg width="1000" height="650" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="650" fill="#f8faf7"/><text x="55" y="100" font-size="34" fill="#173b31">SYNTHETIC TEST DOCUMENT</text><text x="55" y="170" font-size="22">Fictional sample. Not a government record.</text><text x="55" y="280" font-size="25">Owner: Demo Person</text><text x="55" y="340" font-size="25">Survey: SYN-001</text><text x="55" y="400" font-size="25">Village: Synthetic NORTH Village</text></svg>',
    ),
  )
    .toFormat(format)
    .toBuffer();
}
export async function writeFixtures() {
  await mkdir(".local-data/fixtures", { recursive: true });
  await writeFile(
    ".local-data/fixtures/synthetic-record.pdf",
    await samplePdf(),
  );
  await writeFile(
    ".local-data/fixtures/synthetic-record.png",
    await sampleImage(),
  );
}
if (process.argv[1]?.endsWith("document-fixtures.ts"))
  writeFixtures().then(() =>
    console.log("Synthetic PDF and PNG saved in .local-data/fixtures."),
  );
