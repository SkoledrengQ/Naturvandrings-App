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
  imageAlts?: string[];
  audio?: string;
};

/* ---------- lokalisering helpers ---------- */

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

/* ---------- lille fetch helper (accepterer URL eller string) ---------- */

async function fetchJson<T>(url: string | URL): Promise<T> {
  const href = typeof url === "string" ? url : url.toString();
  const res = await fetch(href, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to fetch ${href}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/* ---------- offentlige API’er ---------- */

/** Hent ruter (live-sprog) fra src/data/routes.json */
export async function loadRoutes(lang: Lang = "da"): Promise<Route[]> {
  const routesUrl = new URL("../data/routes.json", import.meta.url);
  const raw = await fetchJson<any[]>(routesUrl);

  return raw.map((r) => {
    const title = pickStr(r.title, lang, { de: r.title_de, en: r.title_en }, r.title) ?? "";
    const summary = pickStr(
      r.summary, lang, { de: r.summary_de, en: r.summary_en }, r.summary ?? undefined
    );
    const difficulty = pickStr(
      r.difficulty, lang, { de: r.difficulty_de, en: r.difficulty_en }, r.difficulty ?? undefined
    );

    const out: Route = {
      id: r.id,
      difficulty,
      title,
      summary: summary ?? null,
      lengthMeters: r.lengthMeters ?? null,
      ageTarget: pickStr(
        r.ageTarget, lang, { de: r.ageTarget_de, en: r.ageTarget_en }, r.ageTarget ?? undefined
      ),
      storyteller: r.storyteller,
      poiOrder: r.poiOrder ?? [],
      polyline: r.polyline,
      coverImage: r.coverImage,
    };
    return out;
  });
}

/**
 * Hent ALLE POIs (live-sprog) ved at:
 *  1) hente src/data/routes.json for rute-IDs
 *  2) hente src/data/pois/route-<id>.json for hver rute
 *  3) samle dem fladt
 */
export async function loadPois(lang: Lang = "da"): Promise<Poi[]> {
  const routesUrl = new URL("../data/routes.json", import.meta.url);
  const routesRaw = await fetchJson<any[]>(routesUrl);

  const routeIds: number[] = routesRaw
    .map((r) => r?.id)
    .filter((id: unknown): id is number => typeof id === "number");

  const perRoute = await Promise.all(
    routeIds.map(async (id) => {
      try {
        const fileUrl = new URL(`../data/pois/route-${id}.json`, import.meta.url);
        const arr = await fetchJson<any[]>(fileUrl);
        if (!Array.isArray(arr)) return [] as any[];
        return arr.map((p) => ({ routeId: id, ...p }));
      } catch (e) {
        console.warn(`Kunne ikke hente src/data/pois/route-${id}.json`, e);
        return [] as any[];
      }
    })
  );

  const raw: any[] = perRoute.flat();

  return raw.map((p) => {
    const title = pickStr(p.title, lang, { de: p.title_de, en: p.title_en }, p.title) ?? "";
    const text = pickStr(
      p.text, lang, { de: p.text_de, en: p.text_en }, typeof p.text === "string" ? p.text : undefined
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
      lon: p.lon,          // din data bruger 'lon'
      radiusMeters: p.radiusMeters,
      text,
      images: Array.isArray(p.images) ? p.images : [],
      imageAlts,
      audio,
    };
    return out;
  });
}
