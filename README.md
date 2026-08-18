# Apresentações Ekotruck

Repositório de trabalho para criação de apresentações da Ekotruck. Este README existe para que qualquer sessão futura (ou pessoa) consiga retomar o contexto rapidamente, sem precisar re-explorar tudo do zero.

## Estrutura da pasta

```
00-Guideline/            → Padrão de marca e modelos de slide (fonte da verdade visual)
01-Repositorio-Slides/   → Decks antigos/dispersos, reaproveitáveis como modelo ou fonte de dados
02-Saida/                → Apresentações NOVAS geradas nas sessões — sempre salvar aqui
README.md                → Este arquivo
```

## Rotina de início de sessão (fazer sempre primeiro)

Antes de avaliar o repositório ou iniciar qualquer trabalho novo:

1. Verificar se há arquivos em `02-Saida/`.
2. Se houver, mover cada um para `01-Repositorio-Slides/` (isso os incorpora ao repositório de referência).
3. Atualizar a tabela de conteúdo em [01-Repositorio-Slides/ — Fonte de slides reaproveitáveis](#01-repositorio-slides--fonte-de-slides-reaproveitáveis) abaixo com uma linha para cada arquivo movido.
4. Só então seguir com a avaliação do repositório / atendimento do pedido do usuário.

Isso mantém `02-Saida/` sempre limpa (só contém entregas da sessão corrente, ainda não incorporadas) e `01-Repositorio-Slides/` sempre atualizado como fonte de reaproveitamento.

## 00-Guideline/ — Padrão Ekotruck

**`Deck_mestre_Ekotruck_corporativo.pptx`** (38 slides) é o guideline oficial. Ao criar uma apresentação nova, comece por aqui.

Conteúdo relevante dentro do deck:
- Slides 1–30: exemplos de modelos de slide prontos para reaproveitar (agenda, contexto, problema, receita por linha, ranking de praças, composição de receita, evolução mensal, indicadores, comparação, roadmap, funil comercial, cenários, case, etc.)
- Slides 31–33 *(adicionados em 2026-08)*: **Ponto de decisão** (duas opções) · **Ponto de decisão** (lista consolidada) · **Fluxograma com bifurcação e convergência** — ver detalhe abaixo
- Slides 34–36: **Banco de ícones** — ícones padronizados para reutilizar em novas peças. Priorize sempre estes ícones (economiza esforço/tokens de geração); se nenhum servir, tem liberdade para criar um novo, desde que siga o mesmo estilo visual (traço, preenchimento, cores da paleta) — e o ícone novo deve ser adicionado de volta a este banco no deck mestre, para não fragmentar o acervo
- Slide 37: **Marca** — logo e aplicação
- Slide 38: **Referência** — referências visuais adicionais

### Templates adicionados em 2026-08

Três templates novos, criados a partir de padrões usados numa apresentação real (Planejamento Estratégico — ver "Histórico de sessões" abaixo) que não tinham equivalente no deck original:

- **Slide 31 — Ponto de decisão (duas opções)**: fundo escuro, badge laranja "PONTO DE DECISÃO", contexto e dois caminhos lado a lado (cada um com uma vantagem em destaque). Use quando a reunião precisa parar em um ponto específico para a diretoria escolher entre dois caminhos.
- **Slide 32 — Ponto de decisão (lista consolidada)**: mesmo badge, uma linha por decisão pendente (ícone + área + do que se trata). Use para recapitular no fechamento de uma reunião todos os pontos que ficaram pendentes de aprovação.
- **Slide 33 — Fluxograma com bifurcação e convergência**: diferente do fluxograma linear do slide 21 (5 passos em sequência), este mostra uma etapa se ramificando em processos paralelos (conectores com seta, não apenas cards lado a lado) e depois convergindo de volta a uma etapa única. Use para processos operacionais com sub-fluxos simultâneos.

O deck original antes dessa adição está salvo em `build/Deck_mestre_Ekotruck_corporativo_BACKUP_pre-2026-08.pptx` (pasta de trabalho da sessão, não faz parte do repositório de entrega) — recorrer a ele apenas se for preciso reverter.

Também existe a skill `anthropic-skills:ekotruck-guideline`, que aplica cores e tipografia oficiais da Ekotruck a qualquer artefato — use-a sempre que for gerar uma peça nova para já sair no padrão visual correto.

**Nota técnica — fonte Elms Sans na QA visual:** a fonte oficial (Elms Sans) não está na lista de fontes "seguras" que o LibreOffice (usado para pré-visualizar decks antes de entregar) renderiza com largura fiel. Isso significa que a checagem visual de "texto estourando a caixa" pode não refletir o resultado real no PowerPoint do usuário. Ao usar Elms Sans em títulos/textos, deixe ~10% de folga extra nas caixas de texto e não confie cegamente no ajuste que aparecer na pré-visualização.

**Confirmado com o usuário (ago/2026): use Elms Sans mesmo assim, não caia para Arial por cautela.** O usuário revisa toda apresentação pessoalmente no PowerPoint dele antes de usar, então a imprecisão da QA local não é motivo para evitar a fonte oficial. Se algo estourar a caixa na revisão dele, a correção preferida é **reduzir o tamanho da fonte**, não redesenhar/redimensionar a caixa de texto — deixe as caixas com folga generosa desde o início para facilitar esse ajuste.

**Ambiente Windows — QA visual sem LibreOffice:** os scripts `scripts/office/soffice.py` e `scripts/thumbnail.py` da skill de pptx dependem de `socket.AF_UNIX`, que não existe no Python do Windows — falham com `AttributeError`. Neste ambiente, a alternativa que funciona é automação via COM do PowerPoint instalado (`New-Object -ComObject PowerPoint.Application`, `Presentations.Open`, `Presentation.SaveAs(pasta, 17)` para exportar todos os slides como JPG). Vale para qualquer sessão futura rodando neste Windows.

**Se o guideline for atualizado no futuro:** as cores e fontes documentadas neste README foram extraídas de uma versão específica do deck mestre. Essa atualização é feita manualmente pelo usuário junto com o assistente quando acontecer — não é uma verificação de rotina no início da sessão.

### Como extrair ativos de marca do deck mestre (dica técnica)

Para reaproveitar o logo e os ícones oficiais programaticamente (ex.: gerando um deck novo via `pptxgenjs` em vez de editar o mestre diretamente):

- **Canvas**: sempre 20×11.25" — nunca o padrão 13.33×7.5 do `LAYOUT_WIDE`. Em pptxgenjs: `pres.defineLayout({ name: "EKOTRUCK", width: 20, height: 11.25 }); pres.layout = "EKOTRUCK";`.
- **Logo**: descompacte o `.pptx` (é um zip) e cruze `ppt/slides/_rels/slideN.xml.rels` com as posições `<a:off>/<a:ext>` em `slideN.xml` para saber qual imagem cai em cada célula. No slide 34 (grade de logos): a imagem com `rId1` é a mini-logo simplificada usada no canto superior direito de todo slide interno; as 4 células da grade 2×2 são completo-claro / completo-verde / simplificado-claro / simplificado-verde, nessa ordem por posição (não pela ordem numérica do arquivo — os `rId`s não seguem a ordem visual). O slide 1 (capa) usa o mesmo asset "completo-verde" do slide 34.
- **Ícones**: o banco (slides 31–33) guarda cada ícone como um par PNG+SVG grudado (a imagem 1 do slide é a mini-logo de cabeçalho; a partir daí, os ícones vêm em pares sequenciais — ícone N usa a imagem `2N` como PNG). Todos são monocromáticos verde-escuro (`#012D2B`) com traço fino. Para reutilizar em fundos variados, recolorir via canal alfa com PIL (`Image.new` do tamanho do ícone + `putalpha(alpha_original)`) gera variantes brancas/teal/laranja mantendo o traço idêntico — não precisa redesenhar o ícone.

## 01-Repositorio-Slides/ — Fonte de slides reaproveitáveis

Decks diversos, já usados em contextos reais, que servem como fonte de conteúdo ou de layout para remontar novas apresentações. **Atenção: dados podem estar desatualizados** — sempre confirmar números/datas com o usuário antes de reaproveitar conteúdo factual (receita, metas, indicadores etc.). Estrutura de slide e argumentação em geral são reaproveitáveis com mais segurança do que os números.

| Arquivo | Conteúdo |
|---|---|
| `Apresentação demonte + Reman.pptx` | CDV Lavras — processo de desmonte, fluxo financeiro, metas, garantia ⚠️ *ver nota abaixo* |
| `Itaipu_Norte_G450_500_540.pptx` | Inteligência comercial SDR (Itaipu Norte) |
| `Pilula de conhecimento - Oficina.pptx` | Treinamento técnico — suspensão, transmissão, elétrico/carroceria |
| `Projeto_UFLA_Ekotruck_revisado.pptx` | Projeto CDV UFLA — contextualização, produtos de remanufatura, cronograma, riscos, fomento, resultado financeiro preliminar |
| `Treinamento_Comercial_Ekotruck_rev0.pptx` | Treinamento comercial — origem de peças, argumentação de vendas, funil |
| `blueprint-area-desmonte-reman-garantia.pptx` | Blueprint da área de desmonte/reman/garantia |

### ⚠️ Arquivo fora do padrão visual: `Apresentação demonte + Reman.pptx`

Em análise comparada com o guideline (canvas, fonte e paleta de cores), este arquivo é o que mais destoa do padrão Ekotruck: usa fonte Poppins (fora do padrão Elms Sans/Arial), preto puro `#000000` em vez do preto oficial `#0F0F0F`, e uma cor roxa (`#0D0A2C`) sem relação com a paleta da marca — além de canvas diferente do guideline (13.33×7.5" vs 20×11.25").

**Use com cautela**: mantido no repositório como fonte de conteúdo/dados (processo de desmonte, fluxo financeiro, garantia), mas **não deve ser usado como referência visual/de layout** para novas apresentações. Ao reaproveitar conteúdo dele, reconstrua o slide no padrão do `00-Guideline/`, não copie a formatação original.

### Convenção de nome de arquivo

Ao salvar em `02-Saida/`, use `NomeDoProjeto_AAAA-MM.pptx` (ou `_AAAA-MM-DD` se houver mais de uma versão no mês). Evitar sufixos como `final`, `final_v2`, `rev0` — eles não indicam data nem contexto e tendem a acumular confusão no repositório.

### Substituição de arquivo no repositório

Quando um arquivo em `01-Repositorio-Slides/` for substituído por uma versão mais nova, mover a versão antiga para `01-Repositorio-Slides/Historico/` em vez de sobrescrever/apagar. Isso preserva a possibilidade de comparar versões depois (já tivemos um caso em que a versão antiga do Projeto UFLA foi perdida e não deu pra comparar o que mudou).

## 02-Saida/ — Apresentações geradas

Toda apresentação nova criada em sessões com o Claude deve ser salva aqui. Isso mantém as entregas finais separadas do material de referência e facilita achar o que foi produzido recentemente.

Pasta **transitória**: no início da próxima sessão, o conteúdo daqui é movido para `01-Repositorio-Slides/` (ver [Rotina de início de sessão](#rotina-de-início-de-sessão-fazer-sempre-primeiro)). Não é o lugar para guardar arquivos por muito tempo.

## Fluxo recomendado para criar uma nova apresentação

1. Confirmar objetivo, público e conteúdo com o usuário.
2. Consultar `00-Guideline/Deck_mestre_Ekotruck_corporativo.pptx` para modelo de slide, ícones e marca (ou usar a skill `ekotruck-guideline`) — **conferir canvas 20×11.25" e reaproveitar logo/ícones do mestre desde a primeira versão**, não só depois de feedback (ver "Como extrair ativos de marca" acima).
3. Buscar em `01-Repositorio-Slides/` conteúdo ou estrutura reaproveitável — validando se os dados ainda são atuais.
4. Gerar o arquivo final e salvar em `02-Saida/`.
5. Fazer QA visual completo (todos os slides, um a um) antes de entregar — ver nota sobre COM do PowerPoint acima para gerar as imagens neste ambiente Windows.

### Preferências de estilo de conteúdo (confirmadas pelo usuário em ago/2026)

- **Títulos de slide diretos**, no formato "Frente — conteúdo" (ex.: `Reman — Análise SWOT`, não `Remanufatura — Análise SWOT` nem títulos-manchete como "Nasce com foco: funil já testado na prática"). Evitar frases de efeito.
- **Texto corrido vira tópicos** sempre que enumerar itens (ex.: "dados de mercado, informação técnica e argumentos comerciais" → três bullets separados, não uma frase só).
- **Pontos de decisão para a diretoria** ganham destaque visual diferente dos demais slides (badge "PONTO DE DECISÃO" em laranja `#F26800`, fundo escuro) — e o texto de contexto que leva à decisão deve ser explicado, não só a pergunta em si.
- **Ao expandir um slide a pedido do usuário, releia a fonte original** (memorando, transcrição da conversa) em vez de só aprofundar o que já está no slide simplificado — o usuário pode pedir de volta detalhes que foram propositalmente resumidos numa rodada anterior (ex.: o funcionamento completo dos 4 fluxos de CDV, cortado na v1 e pedido de volta como slide dedicado na v2).
- **Diagramas de processo devem parecer diagramas de verdade**: caixas conectadas por linhas/setas mostrando o fluxo, não apenas cards lado a lado sem conexão visual.
- **Cuidado ao descrever compras/investimento**: caminhões inteiros são comprados (não peças avulsas); a regra de giro por categoria é sobre como o estoque de peças *resultante do desmonte* é gerenciado — texto que sugira "comprar câmbio" ou "comprar motor" separadamente é impreciso e já gerou correção do usuário.

## Confidencialidade

Este repositório contém dados internos sensíveis (financeiro, margens, investimento, metas comerciais). Não enviar/publicar externamente sem autorização explícita do usuário. Atenção especial ao usar a ferramenta de Artifact (publicação em link web) com conteúdo baseado nesses dados — confirmar com o usuário antes de publicar qualquer coisa que exponha números internos.

## Histórico de sessões

### 2026-08 — Planejamento Estratégico (Engenharia e Qualidade)

Primeira apresentação gerada neste repositório. Deck de 14 slides para reunião de 1h30 com a diretoria, cobrindo CDV Lavras, Comercial, Investimento/estoque, risco documental de motor a base de troca e Reman — a partir de um memorando (`Memorando_Planejamento_Estrategico.docx`) e um prompt de instruções fornecidos pelo usuário fora deste repositório.

Está salvo em `02-Saida/Planejamento_Estrategico_Engenharia_Qualidade_2026-08.pptx`, aguardando a rotina de início da próxima sessão para ser incorporado a `01-Repositorio-Slides/`.

**O que deu errado na primeira tentativa e por quê**: a v1 do deck foi montada sem checar este README nem o `00-Guideline/` primeiro — resultado: canvas errado (13.33×7.5 em vez de 20×11.25), sem o logo oficial, com ícones genéricos (react-icons) em vez do banco da marca, e fonte Arial "por segurança" em vez de Elms Sans. Só foi corrigido ao ler o README após a primeira entrega. **Lição para toda sessão futura**: seguir o "Fluxo recomendado" (acima) *antes* de escrever qualquer slide, não depois.

As preferências de estilo de conteúdo e as dicas técnicas de extração de ativos (logo/ícones/canvas), listadas nas seções acima, vieram das rodadas de revisão desta sessão — mantenha-as atualizadas se o usuário der uma direção diferente numa sessão futura.

**Fechamento da sessão — 3 templates novos no deck mestre.** Dois padrões usados nesta apresentação não tinham equivalente no `00-Guideline/Deck_mestre_Ekotruck_corporativo.pptx` original: o "ponto de decisão" (badge laranja + fundo escuro, usado 3× no deck) e o fluxograma com bifurcação/convergência (diferente do fluxograma linear já existente no slide 21). O usuário confirmou a inclusão; os três slides foram adicionados como templates 31–33 do deck mestre (detalhe na seção `00-Guideline/` acima), duplicando slides existentes via `add_slide.py` e editando o conteúdo com `python-pptx` — não regenerando o `.pptx` do zero, para preservar toda a formatação original intacta. Validado com `validate.py --original` contra o deck anterior ao backup.

## Notas

- Não é um repositório git — apenas uma pasta de trabalho local.
- Ao reorganizar esta pasta no futuro, mantenha este README atualizado.
