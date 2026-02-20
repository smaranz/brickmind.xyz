import { getValidAccessToken } from "@/lib/supabase-auth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface SupabaseRestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: URLSearchParams;
  body?: unknown;
  prefer?: string;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getSupabaseConfig(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}

export async function supabaseRest<T>(
  table: string,
  options: SupabaseRestOptions = {},
): Promise<T> {
  const { url, key } = getSupabaseConfig();
  const endpoint = new URL(`/rest/v1/${table}`, url);

  if (options.query) {
    endpoint.search = options.query.toString();
  }

  const headers = new Headers();
  headers.set("apikey", key);
  const accessToken = await getValidAccessToken();
  headers.set("Authorization", `Bearer ${accessToken || key}`);

  if (options.prefer) {
    headers.set("Prefer", options.prefer);
  }

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint.toString(), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${errorBody}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
