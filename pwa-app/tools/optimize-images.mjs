import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const IMG_DIR   = path.resolve("public/img");   // hvor dine PNG ligger
const MAX_WIDTH = 1600;                         // god bredde til mobil/overlay
const QUALITY   = 82;                           // WebP kvalitet (70–85 typisk fint)

async function listPngs(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await listPngs(p));
    else if (/\.(png)$/i.test(e.name)) out.push(p);
  }
  return out;
}

async function toWebp(srcPath) {
  const ext  = path.extname(srcPath);
  const base = path.basename(srcPath, ext);
  const dst  = path.join(path.dirname(srcPath), `${base}.webp`);

  // spring over hvis .webp allerede findes
  try { await fs.access(dst); return { dst, made: false }; } catch {}

  await sharp(srcPath)
    .rotate() // respekterer EXIF (sikkerhedsnet, mest relevant for fotos)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(dst);

  return { dst, made: true };
}

async function main() {
  console.log("➡️  Scanner:", IMG_DIR);
  const files = await listPngs(IMG_DIR);
  console.log(`🔍 Fandt ${files.length} PNG-filer`);

  let made = 0, skipped = 0;
  for (const f of files) {
    try {
      const res = await toWebp(f);
      if (res.made) made++; else skipped++;
    } catch (e) {
      console.error("Fejl ved", f, e.message);
    }
  }
  console.log(`Konverteret til WebP — nye: ${made}, allerede fandtes: ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
