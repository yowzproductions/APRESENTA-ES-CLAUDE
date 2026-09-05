// Parser do PDF padrão de vistoria (relatório fotográfico Vexsoft) anexado
// na etapa de Vistoria.
//
// O relatório traz uma seção "Fotos da Desmobilização/Mobilização" com um
// ponto fotografado por linha de legenda, no formato "N/TOTAL - Nome do
// ponto" (duas legendas por linha de texto, uma por foto lado a lado).
// O espaçamento entre as duas legendas de uma mesma linha varia conforme o
// extrator de texto usado: um único espaço no pdf-parse (pdfjs-dist, usado
// em produção), múltiplos espaços no pdftotext -layout — por isso o
// lookahead aceita qualquer quantidade de espaço (\s+), não só 2+.
// Validado contra um PDF real (45 pontos extraídos, na ordem correta, com
// os dois extratores).

export interface ParsedInspectionPoint {
  pointNumber: number;
  name: string;
}

const POINT_RE = /(\d+)\/(\d+)\s*-\s*(.+?)(?=(?:\s+\d+\/\d+\s*-)|$)/g;

export function parseInspectionPdf(text: string): ParsedInspectionPoint[] {
  const points: ParsedInspectionPoint[] = [];
  const seen = new Set<number>();

  for (const line of text.split("\n")) {
    const re = new RegExp(POINT_RE);
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const pointNumber = parseInt(m[1], 10);
      const name = m[3].trim();
      if (!name || seen.has(pointNumber)) continue;
      seen.add(pointNumber);
      points.push({ pointNumber, name });
    }
  }

  points.sort((a, b) => a.pointNumber - b.pointNumber);
  return points;
}
