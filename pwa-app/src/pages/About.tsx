import { useEffect } from "react";
import { useHeader } from "../contexts/HeaderContext";
import { useLanguage } from "../contexts/LanguageContext";

export default function About() {
  const { setTitle, setVariant, setRightNode } = useHeader();
  const { lang } = useLanguage();

  useEffect(() => {
    const title =
      lang === "de" ? "Über den Ort" :
      lang === "en" ? "About the place" :
      "Om stedet";
    setTitle(title);
    setVariant("solid");
    setRightNode(null);
    return () => {
      setTitle(null);
      setRightNode(null);
      setVariant("solid");
    };
  }, [lang, setTitle, setVariant, setRightNode]);

  const content = {
    da: {
      h1: "Om stedet – Dorf Møllegård",
      p1: "Dorf Møllegård er et historisk miljø omkring møllesøen – med eng, vandløb og Mølleskoven lige ved siden af. Her mødes kulturhistorie og natur: vindmøllen og de gamle spor af landbruget på den ene side, skovens træer, fugleliv og smådyr på den anden. Rundturen byder på smalle skovstier, den gamle gangbro og flotte kig over landskabet.",
      h2: "Om Mølleskoven",
      p2: "Mølleskoven er en lille, varieret skov med både lysninger og tæt skygge. Stierne er kortere end en skovtur “ud i det blå”, så børn og voksne kan være med. Enkelte passager er stejle eller ujævne – gå efter forholdene og hold dig til stierne.",
      h3: "Om appen",
      p3a: "Denne app giver dig tematiske ruter i skoven. Når du bevæger dig, åbner fortællingerne automatisk ved de markerede punkter (POI’er).",
      p3b: "Sprog: Dansk, tysk og engelsk (oplæsning kun på dansk).",
      p3c: "GPS: Tillad venligst lokalitet, så appen kan starte de rigtige fortællinger på stedet.",
      p3d: "Lyd: Slå gerne lyd til på din telefon for den bedste oplevelse. (Voiceover kun på dansk.)",
      h4: "Gode råd i naturen",
      p4: "Vis hensyn, tag dit affald med, og lad planter og dyr i fred, så andre også kan få en god oplevelse.",
      h5: "Klar?",
      p5: "Vælg en rute og god tur i Mølleskoven!",
    },
    de: {
      h1: "Über den Ort – Dorf Møllegård",
      p1: "Dorf Møllegård ist ein historisches Ensemble rund um den Mühlensee – mit Wiese, Bachlauf und dem Mølleskov direkt nebenan. Hier treffen Kulturgeschichte und Natur aufeinander: die Windmühle und die Spuren der Landwirtschaft einerseits, Bäume, Vogelwelt und Kleintiere des Waldes andererseits. Der Rundgang führt über schmale Pfade, die alte Stegbrücke und bietet schöne Ausblicke auf die Landschaft.",
      h2: "Über den Mølleskov",
      p2: "Der Mølleskov ist ein kleiner, abwechslungsreicher Wald mit Lichtungen und schattigen Bereichen. Die Wege sind kurz genug, damit Kinder und Erwachsene gut mitkommen. Einzelne Abschnitte sind steil oder uneben – bitte den Gegebenheiten entsprechend gehen und auf den Pfaden bleiben.",
      h3: "Über die App",
      p3a: "Die App bietet thematische Routen durch den Wald. Während du dich bewegst, öffnen sich Erzählungen automatisch an den markierten Punkten (POIs).",
      p3b: "Sprachen: Dänisch, Deutsch und Englisch (Vorlesefunktion nur auf Dänisch).",
      p3c: "GPS: Bitte Standort erlauben, damit die richtigen Erzählungen am Ort starten.",
      p3d: "Audio: Für das beste Erlebnis Ton auf deinem Telefon einschalten. (Voiceover nur auf Dänisch.)",
      h4: "Rücksicht in der Natur",
      p4: "Sei rücksichtsvoll, nimm deinen Müll mit und lass Pflanzen und Tiere in Ruhe, damit auch andere eine gute Erfahrung machen können.",
      h5: "Bereit?",
      p5: "Wähle eine Route und genieße deinen Spaziergang im Mølleskov!",
    },
    en: {
      h1: "About the place – Dorf Møllegård",
      p1: "Dorf Møllegård is a historic setting around the mill pond – with meadow, stream and the Mølleskov forest right next door. Here, cultural history meets nature: the windmill and traces of farming on one side, and the forest’s trees, birds and small creatures on the other. The loop features narrow woodland paths, the old footbridge, and lovely views across the landscape.",
      h2: "About Mølleskoven",
      p2: "Mølleskoven is a small, varied forest with both clearings and deep shade. Paths are short enough for children and adults alike. Some sections are steep or uneven – walk according to conditions and keep to the paths.",
      h3: "About the app",
      p3a: "This app offers themed routes in the forest. As you move, stories open automatically at the marked points (POIs).",
      p3b: "Languages: Danish, German and English (narration in Danish only).",
      p3c: "GPS: Please allow location so the app can start the right stories on site.",
      p3d: "Audio: Enable sounds on your phone for the best experience. (Voiceover in Danish only.)",
      h4: "Nature etiquette",
      p4: "Be considerate, take your garbage with you, and leave plants and animals in peace so others can have a good experience.",
      h5: "Ready?",
      p5: "Pick a route and enjoy your walk in Mølleskoven!",
    }
  } as const;

  const c = content[lang as "da" | "de" | "en"] ?? content.da;

  return (
    <main style={{ padding: "16px", maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ marginTop: 8 }}>{c.h1}</h1>
      <p>{c.p1}</p>

      <h2 style={{ marginTop: 18 }}>{c.h2}</h2>
      <p>{c.p2}</p>

      <h2 style={{ marginTop: 18 }}>{c.h3}</h2>
      <p>{c.p3a}</p>
      <ul style={{ marginTop: 8 }}>
        <li>{c.p3b}</li>
        <li>{c.p3c}</li>
        <li>{c.p3d}</li>
      </ul>

      <h2 style={{ marginTop: 18 }}>{c.h4}</h2>
      <p>{c.p4}</p>

      <h2 style={{ marginTop: 18 }}>{c.h5}</h2>
      <p>{c.p5}</p>
    </main>
  );
}
