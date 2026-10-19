// Gedeelde SWR-helpers voor het cachen van pagina-data bij client-side navigatie.

/** Fetcher voor `/api/...` URLs; gooit een Error met de servermelding bij !res.ok. */
export async function jsonFetcher<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let message = `Verzoek mislukt (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

/** Standaardopties voor pagina's: oude data direct tonen, stil op de achtergrond verversen. */
export const SWR_PAGE_OPTIONS = {
  revalidateOnFocus: false,
  revalidateIfStale: true,
  dedupingInterval: 10_000,
  keepPreviousData: true,
} as const;
