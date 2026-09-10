import { mkdir, cp } from "node:fs/promises";
await mkdir("public/pdfjs", { recursive: true });
for (const name of ["build/pdf.worker.min.mjs", "cmaps", "standard_fonts"])
  await cp(
    `node_modules/pdfjs-dist/${name}`,
    `public/pdfjs/${name.split("/").pop()}`,
    { recursive: true },
  );
