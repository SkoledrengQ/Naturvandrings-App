// src/lib/loadPois.ts
import type { Poi, Lang } from "./data";

async function fetchJson<T>(url: string | URL): Promise<T> {
  const href = typeof url === "string" ? url : url.toString();
  const res = await fetch(href, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to fetch ${href}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/* ——— små helpers (samme logik som i data.ts) ——— */
type Localized = string | { da?: string; de?: string; en?: string } | undefined;

function pickStr(
  base: Localized,
  lang: Lang,
  suffix?: Partial<Record<Lang, string>>,
  fallback?: string
): string | undefined {
  if (base && typeof base === "object" && !Array.isArray(base)) {
    const obj = base as { da?: string; de?: string; en?: string };
    const v = obj[lang] ?? obj.da ?? obj.de ?? obj.en;
    return (typeof v === "string" && v.length > 0) ? v : fallback;
  }
  if (suffix) {
    const v = suffix[lang];
    if (typeof v === "string" && v.length > 0) return v;
  }
  if (typeof base === "string" && base.length > 0) return base;
  return fallback;
}

function pickAlts(
  alts: (Localized | undefined)[] | undefined,
  lang: Lang,
  alts_de?: string[],
  alts_en?: string[]
): string[] {
  if (lang === "de" && Array.isArray(alts_de)) return alts_de;
  if (lang === "en" && Array.isArray(alts_en)) return alts_en;
  if (!Array.isArray(alts)) return [];
  return alts.map((a) => pickStr(a, lang) ?? "").map((s) => s || "");
}

/* ——— offentlig API ——— */
export async function loadPoisByRoute(routeId: number, lang: Lang = "da"): Promise<Poi[]> {
  const url = new URL(`../data/pois/route-${routeId}.json`, import.meta.url);
  const raw = await fetchJson<any[]>(url);
  if (!Array.isArray(raw)) return [];

  return raw.map((p) => {
    const title = pickStr(p.title, lang, { de: p.title_de, en: p.title_en }, p.title) ?? "";
    const text  = pickStr(
      p.text, lang, { de: p.text_de, en: p.text_en }, typeof p.text === "string" ? p.text : undefined
    );
    const audio =
      lang === "de" ? p.audio_de ?? p.audio
      : lang === "en" ? p.audio_en ?? p.audio
      : p.audio;
    const imageAlts: string[] = pickAlts(p.imageAlts, lang, p.imageAlts_de, p.imageAlts_en);

    const out: Poi = {
      id: p.id,
      routeId,
      title,
      lat: p.lat,
      lon: p.lon,
      radiusMeters: p.radiusMeters,
      text,
      images: Array.isArray(p.images) ? p.images : [],
      imageAlts,
      audio,
    };
    return out;
  });
}
