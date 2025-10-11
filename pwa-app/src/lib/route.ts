export type LocalizedText = {
  da?: string;
  en?: string;
  de?: string;
};

export type Route = {
  id: number;
  title: LocalizedText;
  polyline?: string;
  lengthMeters?: number;
};

export type PoiMedia = {
  type: "image" | "audio" | "video";
  src: string;
  thumb?: string;
  title?: LocalizedText;
};

export type Poi = {
  id: number;
  routeId: number;
  title: LocalizedText;
  summary?: LocalizedText;
  lat: number;
  lng: number;
  radiusMeters?: number;
  media?: PoiMedia[];
};

export type RunMode = "manual" | "warming" | "auto";
