// tools/i18n-add-stubs.mjs
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const ROUTES_PATH = path.join(ROOT, "src", "data", "routes.json");
const POIS_PATH   = path.join(ROOT, "src", "data", "pois.json");

const ROUTE_TEXT_FIELDS = [
  "title", "summary", "storyteller", "ageTarget", "coverImageAlt", "difficulty", // ← inkluderer difficulty
];
const ROUTE_AUDIO_FIELDS = ["audio"];
const POI_TEXT_FIELDS   = ["title", "text"];
const POI_ARRAY_FIELDS  = ["imageAlts"];
const POI_AUDIO_FIELDS  = ["audio"];

const TARGET_LANGS = ["de", "en"]; // "da" antages som baseline

const isNestedI18n = (val) =>
  val && typeof val === "object" && !Array.isArray(val) &&
  ("da" in val || "de" in val || "en" in val);

function addTextStubs(obj, fields, counters) {
  for (const f of fields) {
    const base = obj[f];
    if (base == null) continue;
    if (isNestedI18n(base)) continue;

    for (const L of TARGET_LANGS) {
      const key = `${f}_${L}`;
      if (!(key in obj)) {
        obj[key] = "";
        counters.added++;
      }
    }
  }
}

function addAudioStubs(obj, fields, counters) {
  for (const f of fields) {
    const base = obj[f];
    if (base == null) continue;
    if (isNestedI18n(base)) continue;

    for (const L of TARGET_LANGS) {
      const key = `${f}_${L}`;
      if (!(key in obj)) {
        obj[key] = "";
        counters.added++;
      }
    }
  }
}

function addArrayStubs(obj, fields, counters) {
  for (const f of fields) {
    const base = obj[f];
    if (!Array.isArray(base)) continue;
    const nestedLike = base.length && isNestedI18n(base[0]);
    if (nestedLike) continue;

    for (const L of TARGET_LANGS) {
      const key = `${f}_${L}`;
      if (!(key in obj)) {
        obj[key] = Array(base.length).fill("");
        counters.added++;
      }
    }
  }
}

async function backupFile(p) {
  const dir = path.dirname(p);
  const base = path.basename(p, ".json");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const bak = path.join(dir, `${base}.backup.${stamp}.json`);
  await fs.copyFile(p, bak);
  return bak;
}

async function readJson(p) {
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

async function writeJson(p, data) {
  const pretty = JSON.stringify(data, null, 2) + "\n";
  await fs.writeFile(p, pretty, "utf8");
}

function reportMissing(arr, kind) {
  let missing = 0;

  const checkText = (obj, fields) => {
    for (const f of fields) {
      const base = obj[f];
      if (base == null || isNestedI18n(base)) continue;
      for (const L of TARGET_LANGS) {
        const key = `${f}_${L}`;
        if (!(key in obj)) missing++;
      }
    }
  };

  const checkArray = (obj, fields) => {
    for (const f of fields) {
      const base = obj[f];
      if (!Array.isArray(base)) continue;
      const nestedLike = base.length && isNestedI18n(base[0]);
      if (nestedLike) continue;
      for (const L of TARGET_LANGS) {
        const key = `${f}_${L}`;
        if (!(key in obj)) missing++;
      }
    }
  };

  const checkAudio = checkText;

  for (const it of arr) {
    if (kind === "route") {
      checkText(it, ROUTE_TEXT_FIELDS);
      checkAudio(it, ROUTE_AUDIO_FIELDS);
    } else {
      checkText(it, POI_TEXT_FIELDS);
      checkArray(it, POI_ARRAY_FIELDS);
      checkAudio(it, POI_AUDIO_FIELDS);
    }
  }
  return missing;
}

async function main() {
  const REPORT_ONLY = process.argv.includes("--report");

  const routes = await readJson(ROUTES_PATH);
  const pois   = await readJson(POIS_PATH);

  if (!Array.isArray(routes) || !Array.isArray(pois)) {
    throw new Error("routes.json eller pois.json er ikke arrays.");
  }

  if (REPORT_ONLY) {
    const rMissing = reportMissing(routes, "route");
    const pMissing = reportMissing(pois, "poi");
    console.log(`Mangler (ruter): ${rMissing}, mangler (POIs): ${pMissing}`);
    process.exit(0);
  }

  console.log("➡️  Backup af datafiler…");
  const bakR = await backupFile(ROUTES_PATH);
  const bakP = await backupFile(POIS_PATH);
  console.log(`   routes.json → ${path.basename(bakR)}`);
  console.log(`   pois.json   → ${path.basename(bakP)}`);

  const counters = { added: 0 };

  for (const r of routes) {
    addTextStubs(r, ROUTE_TEXT_FIELDS, counters);
    addAudioStubs(r, ROUTE_AUDIO_FIELDS, counters);
  }
  for (const p of pois) {
    addTextStubs(p, POI_TEXT_FIELDS, counters);
    addArrayStubs(p, POI_ARRAY_FIELDS, counters);
    addAudioStubs(p, POI_AUDIO_FIELDS, counters);
  }

  await writeJson(ROUTES_PATH, routes);
  await writeJson(POIS_PATH, pois);

  console.log(`✅ Færdig. Tilføjede i alt ${counters.added} tomme oversættelsesfelter (_de/_en).`);
  console.log("   Udfyld dem nu i JSON-filerne. Appen falder stadig tilbage til dansk hvor de er tomme.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
