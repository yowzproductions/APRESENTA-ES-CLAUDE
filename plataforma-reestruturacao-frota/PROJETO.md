# Projeto: Plataforma de Reestruturação de Frota

## 1. Contexto e problema

A devolução de veículos de frota hoje passa por várias equipes (comercial, vistoria,
oficina/mecânica, moderação de orçamento, execução) sem um sistema único que
conecte as etapas. Informação se perde entre times, não há rastreabilidade de quem
decidiu retirar um item do orçamento ou trocar uma peça original por uma
alternativa, e não existe visão consolidada do impacto financeiro da moderação
nem do prazo de cada etapa.

## 2. Objetivo

Construir uma plataforma multi-acesso (um portal, múltiplos perfis de usuário) que
centralize todo o fluxo de reestruturação de frota — do cadastro da devolução até o
veículo pronto para operar — com workflow visual, prazos por etapa, e histórico
auditável de toda decisão que altera o orçamento do cliente.

## 3. Perfis de acesso (multi-acesso)

| Perfil | Responsabilidade principal |
|---|---|
| **Comercial** | Cadastra veículo/cliente para devolução, agenda data de recebimento |
| **Vistoriador** | Executa checklist de recebimento, registra avarias e custo estimado, coleta assinatura do cliente |
| **Mecânica/Oficina** | Executa inspeção técnica e monta orçamento de itens mecânicos |
| **Moderador** | Unifica checklist + inspeção mecânica num orçamento único (sem duplicidade); depois conduz a otimização (remoção de itens, substituição de peças) |
| **Execução (interna/externa)** | Executa os serviços aprovados e atualiza status/prazo |
| **Gestor/Diretoria** | Visão consolidada: impacto financeiro da moderação, veículos finalizados, prazos em atraso |
| **Cliente** (opcional, fase 2) | Visualiza e aprova o orçamento unificado via link/portal |
| **Admin** | Gestão de usuários, permissões, parametrização |

## 4. Fluxo do processo (workflow)

```
1. CADASTRO (Comercial)
   → dados do veículo + cliente que vai devolver

2. AGENDAMENTO (Comercial)
   → contato com cliente, define data/hora de recebimento
   [prazo: data agendada]

3. VISTORIA DE RECEBIMENTO (Vistoriador)
   → checklist de recebimento, lista de avarias com custo estimado
   → assinatura do responsável da entrega (cliente)
   → cliente é informado: veículo seguirá para inspeção mecânica;
     orçamento final somará as duas inspeções
   [prazo: data da vistoria]

4. INSPEÇÃO MECÂNICA (Oficina/Mecânica)
   → orçamento técnico (itens mecânicos + custo estimado)
   [prazo: data limite da inspeção]

5. UNIFICAÇÃO DO ORÇAMENTO (Moderador)
   → junta itens do checklist + inspeção mecânica
   → remove duplicidades (mesmo dano identificado nas duas frentes)
   → gera ORÇAMENTO BASE único, enviado ao cliente
   [prazo: SLA de unificação]

6. APROVAÇÃO DO CLIENTE
   → cliente aprova o orçamento base
   [prazo: SLA de resposta do cliente]

7. OTIMIZAÇÃO DE ORÇAMENTO (Moderador) — só após aprovação
   → remoção de serviços supérfluos (com responsável + justificativa/evidência)
   → terceirização de serviços simples
   → substituição de peça original por peça Ekotruck (estoque) ou peça Spot
     (multimarcas — com fornecedor, preço e marca)
   → gera ORÇAMENTO FINAL, com diff (preço base x preço final = impacto da moderação)
   [prazo: SLA de otimização]

8. EXECUÇÃO DOS SERVIÇOS (interno e/ou externo)
   → acompanhamento por item/serviço, com prazo e status
   [prazo: data prevista de conclusão por serviço]

9. VEÍCULO FINALIZADO
   → todos os serviços concluídos → veículo pronto para operar
```

Cada etapa deve ser visualizável como **quadro de workflow** (kanban por status) e
cada card deve expor claramente: etapa atual, responsável, prazo (quando houver) e
alerta de atraso.

## 5. Regras de negócio centrais

- **Unificação (etapa 5):** todo item do orçamento final precisa apontar sua origem
  (checklist, inspeção mecânica, ou ambos quando duplicado e mesclado). Isso é o
  que permite reconstituir depois "de onde veio" cada item.
- **Otimização (etapa 7):**
  - Todo item **removido** do orçamento precisa registrar: quem removeu, quando,
    e justificativa/evidência (texto e/ou anexo).
  - Toda **substituição de peça** precisa registrar: peça/preço original, peça
    substituta, marca, preço, origem (estoque Ekotruck ou Spot) e, se Spot, o
    fornecedor.
  - O sistema deve calcular e exibir **preço base → preço final → diferença
    (economia)**, e disponibilizar essa visão tanto por veículo quanto agregada
    (todos os veículos, por período) para mostrar o impacto do serviço de
    moderação.
- **Prazos:** todo card de etapa tem um campo de prazo opcional; quando vencido,
  fica destacado no board e conta para indicadores de atraso do gestor.
- **Auditoria:** toda mudança de status e todo campo sensível (remoção, substituição,
  valores) gera um registro de histórico imutável (quem, quando, o quê).

## 6. Roadmap de entrega

**Fase 1 — MVP (esta entrega):**
- Modelo de dados completo (todas as entidades acima) em Postgres/Supabase.
- Autenticação com perfis (RLS por papel).
- Cadastro de devolução → agendamento → checklist de vistoria → inspeção mecânica
  → unificação → aprovação do cliente → otimização (remoção/substituição) →
  execução → finalizado.
- Kanban visual do processo + página de detalhe do caso com todas as abas do
  fluxo.
- Painel de impacto financeiro da moderação (base x final x economia).

**Fase 2:**
- Portal do cliente (link externo de aprovação, sem login completo).
- Assinatura digital real no checklist (hoje: campo de nome + upload de imagem/anexo).
- Notificações automáticas de prazo (e-mail/whatsapp).
- Relatórios exportáveis (PDF/Excel) por veículo e por período.

**Fase 3:**
- Integração com fornecedores Spot (catálogo de peças/preços).
- App mobile para vistoriador (checklist offline-first).

## 7. Stack técnica proposta

- **Frontend/Backend:** Next.js (App Router) + TypeScript + Tailwind.
- **Banco/Auth/Storage:** Supabase (Postgres + Row Level Security + Auth + Storage
  para fotos/assinaturas/anexos).
- **Deploy:** Vercel.

Ver `schema.sql` (modelo de dados completo) e `app/` (scaffold inicial da
plataforma) nesta mesma pasta.
