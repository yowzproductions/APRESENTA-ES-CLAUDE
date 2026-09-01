# Plataforma de Reestruturação de Frota

MVP da plataforma multi-acesso para centralizar o fluxo de devolução e
reestruturação de veículos de frota (comercial → vistoria → inspeção mecânica
→ orçamento unificado → aprovação do cliente → otimização → execução →
finalizado).

- **`PROJETO.md`** — o projeto completo: contexto, perfis de acesso, fluxo
  detalhado, regras de negócio e roadmap.
- **`supabase/migrations/0001_init.sql`** — modelo de dados completo
  (Postgres/Supabase), com RLS habilitado.
- **`supabase/migrations/0002_hardening.sql`** — correções pós-provisionamento
  (índices em FKs, policies de RLS consolidadas/otimizadas, view sem
  security definer) aplicadas com base no linter de segurança/performance
  do Supabase.
- **`app/`** — scaffold Next.js (App Router) da plataforma: dashboard em
  workflow/kanban, cadastro de novo caso, página de detalhe do caso por
  etapa, painel de impacto financeiro da moderação.

## Projeto Supabase

O banco já está provisionado no projeto **`processos-plataforma`**
(`gsbmywrigseigtyqsmbr`, região `us-east-1`), com as migrations `0001_init.sql`
e `0002_hardening.sql` aplicadas.

```
NEXT_PUBLIC_SUPABASE_URL=https://gsbmywrigseigtyqsmbr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_2hYyDqS3z2PQeT080_g40w_2GGtxU2J
```

(URL e chave publicável — seguras para uso no front-end. A service role key é
secreta, não deve ser usada aqui, e só deve ser solicitada ao usuário caso
alguma rotina server-side específica venha a precisar dela.)

## Rodando localmente

```bash
cd app
npm install
cp .env.example .env.local   # preencher com URL + anon key acima
npm run dev
```

Sem `.env.local` preenchido, o app roda com dados de demonstração
(`src/lib/mock-data.ts`) para já nascer navegável.

## Primeiro acesso (bootstrap do admin)

Não existe UI de gestão de usuários nesta fase (MVP). O signup grava o
usuário em `auth.users` e cria automaticamente uma linha em `profiles` (via
trigger), mas **sem `role` definida** — só um admin atribui papéis. Para
promover o primeiro usuário a admin, rode no SQL Editor do Supabase:

```sql
update public.profiles set role = 'admin' where id = '<uuid do usuário>';
```

## Provisionando o banco (outro projeto/ambiente)

Aplique `supabase/migrations/0001_init.sql` e depois `0002_hardening.sql`, em
ordem, no projeto Supabase (via CLI, dashboard ou MCP).
