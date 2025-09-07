// src/contexts/LanguageContext.tsx
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LangCode = "da" | "de" | "en";

// Rekursiv dictionary: interface (ikke type alias) for at undgå TS2456
interface Dict {
  [key: string]: string | Dict;
}

const MESSAGES: Record<LangCode, Dict> = {
  da: {
    run: {
      prev: "← Tilbage",
      next: "Frem →",
      stop: "Stop",
      progress: "{cur}/{total}",
      start: "Start fortælling: {title}",
    },
    gps: {
      warningTitle: "GPS-advarsel",
      couldNotGet: "Kunne ikke hente position.",
    },
  },
  de: {
    run: {
      prev: "← Zurück",
      next: "Weiter →",
      stop: "Beenden",
      progress: "{cur}/{total}",
      start: "Erzählung starten: {title}",
    },
    gps: {
      warningTitle: "GPS-Warnung",
      couldNotGet: "Position konnte nicht ermittelt werden.",
    },
  },
  en: {
    run: {
      prev: "← Back",
      next: "Next →",
      stop: "Stop",
      progress: "{cur}/{total}",
      start: "Start story: {title}",
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
