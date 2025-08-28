export async function safeFetchJson<T>(url: URL): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    // Netværksfejl, offline osv.
    throw new Error(`Netværksfejl ved hentning af ${url}: ${(e as Error).message}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ved hentning af ${url}`);
  }
  try {
    return await res.json() as T;
  } catch (e) {
    throw new Error(`JSON parse-fejl for ${url}: ${(e as Error).message}`);
  }
}
