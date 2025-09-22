// src/contexts/LanguageContext.tsx
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LangCode = "da" | "de" | "en";

// Rekursiv dictionary
interface Dict {
  [key: string]: string | Dict;
}

const MESSAGES: Record<LangCode, Dict> = {
  da: {
    home: {
      hometitle: "Udforsk Mølleskoven",
      homelead:
        "Tag på naturvandring og oplev fortællinger om istidens kræfter, randmoræner og livet omkring møllebækken. Vælg en rute og lad telefonen guide dig ved de markante steder i terrænet.",

      ctaRoutes: "Se ruter",
      ctaAbout: "Om stedet",
      start: "Start",

      howTitle: "Sådan fungerer det",

      howStep1_pre: "Vælg en rute under",
      howStep1_post: ".",

      howStep2: "Åbn den rute, du vil følge, og tryk \"Detaljer\".",
      howStep3: "Læs om ruten (varighed m.m.) og se de interessante steder, du kommer forbi.",

      howStep4_pre: "Tryk",
      howStep4_post: " for at begynde turen.",

      howStep5_gps: "Hvis appen beder om adgang til din lokation (GPS), så tillad det for den bedste oplevelse.",
      howStep6: "Telefonen fortæller dig, når du står ved et interessant sted."
    },
    common: {
      home: "Til forside",
      back: "Tilbage",
      start: "Start",
      loadError: "Kunne ikke indlæse data.",
      close: "Luk"
    },
    routes: {
      title: "Ruter",
      loading: "Indlæser ruter…",
      details: "Detaljer",
      lengthUnknown: "Længde: ukendt",
      storyteller: "Fortæller",
      stopsLabel: "stop",
    },
    route: {
      loading: "Indlæser rute…",
      coverAlt: "Rute-cover",
      stopsTitle: "Stop på ruten",
      noStops: "Der er endnu ikke tilknyttet stop til ruten.",
      startRoute: "Start ruten",
    },
    run: {
      prev: "← Tilbage",
      next: "Frem →",
      stop: "Stop",
      progress: "{cur}/{total}",
      start: "Start fortælling: {title}",
      reopen: "Genåbn fortælling",
      finish: "Afslut",
    },
    gps: {
      warningTitle: "GPS-advarsel",
      couldNotGet: "Kunne ikke hente position.",
    },
  },

  de: {
    home: {
      hometitle: "Erkunden Sie den Mølleskov",
      homelead:
        "Begeben Sie sich auf einen Naturspaziergang und entdecken Sie Geschichten über die Kräfte der Eiszeit, Endmoränen und das Leben am Mühlbach. Wählen Sie eine Route und lassen Sie sich an markanten Stellen im Gelände führen.",

      ctaRoutes: "Routen ansehen",
      ctaAbout: "Über den Ort",
      start: "Start",

      howTitle: "So funktioniert es",

      howStep1_pre: "Wählen Sie unter",
      howStep1_post: " eine Route.",

      howStep2: "Öffnen Sie die gewünschte Route und tippen Sie auf „Details“.",
      howStep3: "Lesen Sie die Routeninfos (Dauer usw.) und sehen Sie die interessanten Orte, an denen Sie vorbeikommen.",

      howStep4_pre: "Tippen Sie auf",
      howStep4_post: ", um die Tour zu beginnen.",

      howStep5_gps: "Falls die App um Standortzugriff (GPS) bittet, erlauben Sie ihn für das beste Erlebnis.",
      howStep6: "Ihr Telefon meldet sich, wenn Sie an einer sehenswerten Stelle stehen."
    },
    common: {
      home: "Zur Startseite",
      back: "Zurück",
      start: "Start",
      loadError: "Daten konnten nicht geladen werden.",
      close: "Schließen"
    },
    routes: {
      title: "Routen",
      loading: "Lade Routen…",
      details: "Details",
      lengthUnknown: "Länge: unbekannt",
      storyteller: "Erzähler",
      stopsLabel: "Stopps",
    },
    route: {
      loading: "Route wird geladen…",
      coverAlt: "Routen-Cover",
      stopsTitle: "Stopps der Route",
      noStops: "Dieser Route sind noch keine Stopps zugeordnet.",
      startRoute: "Route starten",
    },
    run: {
      prev: "← Zurück",
      next: "Weiter →",
      stop: "Beenden",
      progress: "{cur}/{total}",
      start: "Erzählung starten: {title}",
      reopen: "Erzählung erneut öffnen",
      finish: "Beenden",
    },
    gps: {
      warningTitle: "GPS-Warnung",
      couldNotGet: "Position konnte nicht ermittelt werden.",
    },
  },

  en: {
    home: {
      hometitle: "Explore Mølleskoven",
      homelead:
        "Go on a nature walk and discover stories about the Ice Age’s forces, terminal moraines, and life around the mill brook. Choose a route and let your phone guide you at notable spots in the terrain.",

      ctaRoutes: "See routes",
      ctaAbout: "About",
      start: "Start",

      howTitle: "How it works",

      howStep1_pre: "Choose a route under",
      howStep1_post: ".",

      howStep2: "Open the route you want and tap “Details”.",
      howStep3: "Read about the route (duration, etc.) and see the interesting places you’ll pass.",

      howStep4_pre: "Tap",
      howStep4_post: " to begin the walk.",

      howStep5_gps: "If the app asks to use your location (GPS), allow it for the best experience.",
      howStep6: "Your phone notifies you when you’re at a point of interest."
    },
    common: {
      home: "Home",
      back: "Back",
      start: "Start",
      loadError: "Couldn’t load data.",
      close: "Close"
    },
    routes: {
      title: "Routes",
      loading: "Loading routes…",
      details: "Details",
      lengthUnknown: "Length: unknown",
      storyteller: "Storyteller",
      stopsLabel: "stops",
    },
    route: {
      loading: "Loading route…",
      coverAlt: "Route cover",
      stopsTitle: "Stops on the route",
      noStops: "No stops have been added to this route yet.",
      startRoute: "Start the route",
    },
    run: {
      prev: "← Back",
      next: "Next →",
      stop: "Stop",
      progress: "{cur}/{total}",
      start: "Start story: {title}",
      reopen: "Reopen story",
      finish: "Finish",
    },
    gps: {
      warningTitle: "GPS warning",
      couldNotGet: "Could not get position.",
    },
  },
};

const SUPPORTED: LangCode[] = ["da", "de", "en"];

function lookup(dict: Dict, path: string): string | undefined {
  const parts = path.split(".");
  let cur: any = dict;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

function applyVars(template: string, vars?: Record<string, any>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : ""
  );
}

type Ctx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string, vars?: Record<string, any>) => string;
  available: LangCode[]; // bruges i Header
};

const LanguageCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const initial =
    (localStorage.getItem("lang") as LangCode | null) ??
    (navigator.language?.slice(0, 2) as LangCode) ??
    "da";
  const startLang: LangCode = SUPPORTED.includes(initial) ? initial : "da";

  const [lang, setLangState] = useState<LangCode>(startLang);

  const setLang = (l: LangCode) => {
    const next = SUPPORTED.includes(l) ? l : "da";
    setLangState(next);
    localStorage.setItem("lang", next);
  };

  const t = (key: string, vars?: Record<string, any>) => {
    const msg =
      lookup(MESSAGES[lang], key) ??
      lookup(MESSAGES.da, key) ??
      key; // sidste udvej: vis nøgle
    return applyVars(msg, vars);
  };

  const value = useMemo<Ctx>(
    () => ({ lang, setLang, t, available: SUPPORTED }),
    [lang]
  );

  return <LanguageCtx.Provider value={value}>{children}</LanguageCtx.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageCtx);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
