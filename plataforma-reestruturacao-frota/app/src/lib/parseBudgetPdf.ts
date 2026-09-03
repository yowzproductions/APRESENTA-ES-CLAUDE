// Parser do PDF padrão de orçamento (espelho de negociação SICONnet) anexado
// na etapa de Inspeção Mecânica.
//
// Formato de cada linha de item na tabela "Produto / Descrição / NCM / Qtde. /
// Preço Unit. / IPI / Subs. Tributária / Preço Total / Prev. Uso":
//   <linha de produto (1-2 díg.)> <partnumber> <descrição...> [<NCM>] <qtde>
//   <preço unit.> <ipi> <subs. trib.> <preço total> <prev. uso> /
// A descrição às vezes quebra em várias linhas antes dos números aparecerem —
// por isso o parser acumula linhas até encontrar o "rabo" numérico completo.
// Validado contra um PDF real da WLM/Ekotruck (16 itens, soma bate exatamente
// com o "Total Geral" impresso no documento).

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

const ITEM_START = /^\*?(\d{1,2})\s+(\d{4,9})\s+(.+)$/;
const PAGE_MARK = /^--\s*\d+\s*of\s*\d+\s*--$/;
const TAIL_RE =
  /^(?<desc>.+?)\s+(?:(?<ncm>\d{6,10})\s+)?(?<qtde>\d+(?:,\d+)?)\s+(?<unit>[\d.]+,\d{2})\s+[\d.]+,\d{2}\s+[\d.]+,\d{2}\s+(?<total>[\d.]+,\d{2})\s+[\d.]+,\d+\s*\/$/;

function toNumber(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

export function parseBudgetPdf(text: string): ParsedBudgetItem[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !PAGE_MARK.test(l));

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

    const itemStart = line.match(ITEM_START);
    if (itemStart) {
      collectingTaskName = false;
      const productLine = itemStart[1].padStart(2, "0");
      const partNumber = itemStart[2];
      let buffer = itemStart[3];
      let j = i + 1;
      let tail = buffer.match(TAIL_RE);
      const MAX_LOOKAHEAD = 4;
      let extra = 0;
      while (!tail && j < lines.length && extra < MAX_LOOKAHEAD) {
        if (PAGE_MARK.test(lines[j])) {
          j++;
          continue;
        }
        buffer += " " + lines[j];
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
