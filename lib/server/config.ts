import "server-only";

export interface LiveConfig {
  typesafeApiKey: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  rateLimitSecret: string;
  onVercel: boolean;
}

export function getLiveConfig(): LiveConfig | null {
  if (process.env.LIVE_INFERENCE_ENABLED !== "true") return null;
  const typesafeApiKey = process.env.TYPESAFE_API_KEY?.trim();
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const rateLimitSecret = process.env.RATE_LIMIT_SECRET?.trim();

  if (
    !typesafeApiKey ||
    !supabaseUrl ||
    !supabaseServiceRoleKey ||
    !rateLimitSecret ||
    rateLimitSecret.length < 32
  ) return null;

  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
  } catch {
    return null;
  }

  return {
    typesafeApiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
    rateLimitSecret,
    onVercel: process.env.VERCEL === "1",
  };
}
