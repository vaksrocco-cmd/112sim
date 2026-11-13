// Integraatori fail. Supabase REST (PostgREST) otse fetch'iga, ainult serveris.
const url = () => process.env.SUPABASE_URL;
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseConfigured(): boolean {
  return Boolean(url() && key());
}

export async function supabaseRequest<T>(pathAndQuery: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${url()}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key()!,
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}
