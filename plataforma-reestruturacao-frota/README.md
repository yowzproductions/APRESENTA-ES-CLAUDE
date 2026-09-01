# Plataforma de Reestruturação de Frota

MVP da plataforma multi-acesso para centralizar o fluxo de devolução e
reestruturação de veículos de frota (comercial → vistoria → inspeção mecânica
→ orçamento unificado → aprovação do cliente → otimização → execução →
finalizado).

- **`PROJETO.md`** — o projeto completo: contexto, perfis de acesso, fluxo
  detalhado, regras de negócio e roadmap.
- **`supabase/migrations/0001_init.sql`** — modelo de dados completo
  (Postgres/Supabase), com RLS habilitado.
- **`app/`** — scaffold Next.js (App Router) da plataforma: dashboard em
  workflow/kanban, cadastro de novo caso, página de detalhe do caso por
  etapa, painel de impacto financeiro da moderação.

## Rodando localmente

```bash
cd app
npm install
cp .env.example .env.local   # preencher com URL + anon key do projeto Supabase
npm run dev
```

Sem `.env.local` preenchido, o app roda com dados de demonstração
(`src/lib/mock-data.ts`) para já nascer navegável.

## Provisionando o banco

Aplique `supabase/migrations/0001_init.sql` no projeto Supabase (via CLI,
dashboard ou MCP). **A service role key é secreta e não deve ser usada sem
confirmação explícita do usuário antes de cada uso.**
