import { safeFetchJson } from "./http";

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
  audio?: string;
};

export function loadRoutes() {
  return safeFetchJson<Route[]>(new URL("../data/routes.json", import.meta.url));
}

export function loadPois() {
  return safeFetchJson<Poi[]>(new URL("../data/pois.json", import.meta.url));
}
