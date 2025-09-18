import { safeFetchJson } from "./http";

export type Lang = "da" | "de" | "en";

export type Route = {
  difficulty: any;
  id: number;
  title: string;
  summary?: string | null;
  lengthMeters?: number | null;
  ageTarget?: string;
  storyteller?: string;
  poiOrder: number[];
  polyline?: [number, number][];
  coverImage?: string;
};

export type Poi = {
  id: number;
  routeId: number;
  title: string;
  lat: number;
  lon: number;
  radiusMeters?: number;
  text?: string;
  images?: string[];
  imageAlts?: string[];   // (bliver [] hvis ikke angivet)
  audio?: string;
};

/** Tillader både ren streng, eller objekt {da,de,en} */
type Localized = string | { da?: string; de?: string; en?: string } | undefined;

/** Vælg sprog med fallback: ønsket → da → de → en → fallback */
function pickStr(
  base: Localized,
  lang: Lang,
  suffix?: Partial<Record<Lang, string>>,
  fallback?: string
): string | undefined {
  // base som objekt {da,de,en}?
  if (base && typeof base === "object" && !Array.isArray(base)) {
    const obj = base as { da?: string; de?: string; en?: string };
    const v = obj[lang] ?? obj.da ?? obj.de ?? obj.en;
    return (typeof v === "string" && v.length > 0) ? v : fallback;
  }

  // suffix: KUN brug det aktuelle sprog – ingen cross-lang fallback her
  if (suffix) {
    const v = suffix[lang];
    if (typeof v === "string" && v.length > 0) return v;
  }

  // basis-streng (dansk hos jer)
  if (typeof base === "string" && base.length > 0) return base;

  return fallback;
}

/** Map et array af (evt. lokaliserede) alt-tekster til fladt string[] */
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

/** Hent ruter (live-sprog) */
export async function loadRoutes(lang: Lang = "da"): Promise<Route[]> {
  const raw = await safeFetchJson<any[]>(
    new URL("../data/routes.json", import.meta.url)
  );

  return raw.map((r) => {
    const title = pickStr(r.title, lang, { de: r.title_de, en: r.title_en }, r.title) ?? "";
    const summary = pickStr(
      r.summary,
      lang,
      { de: r.summary_de, en: r.summary_en },
      r.summary ?? undefined
    );
    // ← NYT: lokaliser difficulty med suffix-fallback
    const difficulty = pickStr(
      r.difficulty,
      lang,
      { de: r.difficulty_de, en: r.difficulty_en },
      r.difficulty ?? undefined
    );

    const out: Route = {
      id: r.id,
      difficulty, // ← NYT: nu sproget
      title,
      summary: summary ?? null,
      lengthMeters: r.lengthMeters ?? null,
      ageTarget: pickStr(
        r.ageTarget,
        lang,
        { de: r.ageTarget_de, en: r.ageTarget_en },
        r.ageTarget ?? undefined
      ),
      storyteller: r.storyteller,
      poiOrder: r.poiOrder ?? [],
      polyline: r.polyline,
      coverImage: r.coverImage,
    };
    return out;
  });
}

/** Hent POIs (live-sprog) */
export async function loadPois(lang: Lang = "da"): Promise<Poi[]> {
  const raw = await safeFetchJson<any[]>(
    new URL("../data/pois.json", import.meta.url)
  );

  return raw.map((p) => {
    const title = pickStr(p.title, lang, { de: p.title_de, en: p.title_en }, p.title) ?? "";
    const text = pickStr(
      p.text,
      lang,
      { de: p.text_de, en: p.text_en },
      typeof p.text === "string" ? p.text : undefined
    );
    const audio =
      lang === "de" ? p.audio_de ?? p.audio
      : lang === "en" ? p.audio_en ?? p.audio
      : p.audio;

    const imageAlts: string[] = pickAlts(p.imageAlts, lang, p.imageAlts_de, p.imageAlts_en);

    const out: Poi = {
      id: p.id,
      routeId: p.routeId,
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
