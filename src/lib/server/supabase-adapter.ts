export interface SupabaseRestRequestDescriptor {
  enabled: boolean;
  url?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
}

export function buildSupabaseRestRequest(
  table: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  payload?: Record<string, unknown>,
  env: Record<string, string | undefined> = process.env
): SupabaseRestRequestDescriptor {
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!baseUrl || !serviceKey) {
    return { enabled: false };
  }

  const cleanUrl = baseUrl.replace(/\/+$/, "");
  return {
    enabled: true,
    url: `${cleanUrl}/rest/v1/${table}`,
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  };
}

export async function syncTableRowToSupabase(
  table: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const req = buildSupabaseRestRequest(table, "POST", payload);
  if (!req.enabled || !req.url || !req.headers) {
    return false;
  }
  try {
    const res = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
    return res.ok;
  } catch {
    return false;
  }
}
