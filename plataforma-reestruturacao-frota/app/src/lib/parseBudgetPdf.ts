// Parser do PDF padrão de orçamento (espelho de negociação SICONnet) anexado
// na etapa de Inspeção Mecânica.
//
// Formato de cada linha de item na tabela "Produto / Descrição / NCM / Qtde. /
// Preço Unit. / IPI / Subs. Tributária / Preço Total / Prev. Uso":
//   <linha de produto (1-2 díg.)> <partnumber> <descrição...> [<NCM>] <qtde>
//   <preço unit.> <ipi> <subs. trib.> <preço total> <prev. uso> /
// A descrição às vezes quebra em várias linhas antes dos números aparecerem —
// por isso o parser acumula linhas até encontrar o "rabo" numérico completo.
//
// A coluna "Produto" (linha + partnumber) às vezes vem numa linha só
// ("01 2200142 ...") e às vezes quebra em duas linhas separadas ("01" numa
// linha, "2200142" na linha seguinte) — depende só de como o SICONnet
// justificou aquela célula ao gerar o PDF, varia dentro do mesmo documento.
// O parser reconhece os dois casos.
//
// Validado contra PDFs reais da WLM/Ekotruck (com e sem a quebra acima).

export interface ParsedBudgetItem {
  taskNumber: number | null;
  taskName: string;
  productLine: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Caso A: linha, partnumber e o resto (descrição + números) juntos.
const ITEM_START_COMBINED = /^\*?(\d{1,2})\s+(\d{4,10})\s+(.+)$/;
// Caso B: linha sozinha; o partnumber vem isolado na linha seguinte.
const ITEM_START_SOLO = /^\*?(\d{1,2})$/;
const PART_NUMBER_SOLO = /^(\d{4,10})$/;

const PAGE_MARK = /^--\s*\d+\s*of\s*\d+\s*--$/;
// Cabeçalho repetido a cada quebra de página ("25/08/2026, 18:08  SICONnet")
// e o link de origem do relatório — ruído que pode cair no meio de um item
// dividido em várias linhas.
const PAGE_HEADER = /^\d{2}\/\d{2}\/\d{4},?\s+\d{2}:\d{2}(:\d{2})?\s+SICONnet$/i;
const URL_LINE = /^https?:\/\//i;

const TAIL_RE =
  /^(?<desc>.+?)\s+(?:(?<ncm>\d{6,10})\s+)?(?<qtde>\d+(?:,\d+)?)\s+(?<unit>[\d.]+,\d{2})\s+[\d.]+,\d{2}\s+[\d.]+,\d{2}\s+(?<total>[\d.]+,\d{2})\s+[\d.]+,\d+\s*\/$/;

function toNumber(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

function isNoiseLine(l: string): boolean {
  return PAGE_MARK.test(l) || PAGE_HEADER.test(l) || URL_LINE.test(l);
}

export function parseBudgetPdf(text: string): ParsedBudgetItem[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !isNoiseLine(l));

  const items: ParsedBudgetItem[] = [];
  let currentTask: { number: number; name: string } | null = null;
  let collectingTaskName = false;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const taskMatch = line.match(/^TAREFA\s+(\d+)\s*(.*)$/i);
    if (taskMatch) {
      currentTask = { number: parseInt(taskMatch[1], 10), name: taskMatch[2] || "" };
      collectingTaskName = true;
      i++;
      continue;
    }

    const combined = line.match(ITEM_START_COMBINED);
    const soloLine = !combined ? line.match(ITEM_START_SOLO) : null;
    const soloPartNumber = soloLine && i + 1 < lines.length ? lines[i + 1].match(PART_NUMBER_SOLO) : null;

    if (combined || (soloLine && soloPartNumber)) {
      collectingTaskName = false;

      let productLine: string;
      let partNumber: string;
      let buffer: string;
      let j: number;
      if (combined) {
        productLine = combined[1].padStart(2, "0");
        partNumber = combined[2];
        buffer = combined[3];
        j = i + 1;
      } else {
        productLine = soloLine![1].padStart(2, "0");
        partNumber = soloPartNumber![1];
        buffer = "";
        j = i + 2;
      }

      let tail = buffer.match(TAIL_RE);
      const MAX_LOOKAHEAD = 5;
      let extra = 0;
      while (!tail && j < lines.length && extra < MAX_LOOKAHEAD) {
        if (isNoiseLine(lines[j])) {
          j++;
          continue;
        }
        buffer = buffer ? `${buffer} ${lines[j]}` : lines[j];
        tail = buffer.match(TAIL_RE);
        j++;
        extra++;
      }

      if (tail && tail.groups) {
        items.push({
          taskNumber: currentTask?.number ?? null,
          taskName: (currentTask?.name ?? "").replace(/\(\s*-?\s*\)\s*$/, "").trim(),
          productLine,
          partNumber,
          description: tail.groups.desc.replace(/\s+/g, " ").trim(),
          quantity: toNumber(tail.groups.qtde),
          unitPrice: toNumber(tail.groups.unit),
          totalPrice: toNumber(tail.groups.total),
        });
        i = j;
      } else {
        i++;
      }
      continue;
    }

    if (collectingTaskName && currentTask) {
      currentTask.name += " " + line;
      i++;
      continue;
    }

    i++;
  }

  return items;
}
