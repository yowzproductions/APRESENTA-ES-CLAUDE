// URL e chave publicável (anon) do projeto Supabase — não são segredo, servem
// como fallback para o deploy funcionar sem precisar configurar variáveis de
// ambiente na Vercel. A service role key NUNCA entra aqui.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gsbmywrigseigtyqsmbr.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_2hYyDqS3z2PQeT080_g40w_2GGtxU2J";
