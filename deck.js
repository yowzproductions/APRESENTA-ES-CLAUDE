const pptxgen = require("pptxgenjs");
const path = require("path");

const A = (n) => path.join(__dirname, "assets", n);

// Brand palette (Ekotruck)
const DARKGREEN = "012D2B";
const TEAL = "0C6D61";
const MINT = "A3CCAB";
const ORANGE = "F26800";
const LIGHT = "EAF0EC";
const GRAY = "5F6369";
const WHITE = "FFFFFF";
const CARD_DARK = "0A3A37"; // card fill on dark bg

const FONT = "Elms Sans"; // official Ekotruck typeface

const pres = new pptxgen();
pres.defineLayout({ name: "EKOTRUCK", width: 20, height: 11.25 });
pres.layout = "EKOTRUCK";
const PW = 20, PH = 11.25;

function icon(slide, { x, y, w, h, name, color = "darkgreen" }) {
  slide.addImage({ path: A(`${name}_${color}.png`), x, y, w, h });
}

function iconCircle(slide, { x, y, d = 0.85, circleColor = TEAL, name, color = "white" }) {
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: circleColor }, line: { type: "none" } });
  const pad = d * 0.28;
  icon(slide, { x: x + pad / 2, y: y + pad / 2, w: d - pad, h: d - pad, name, color });
}

function kicker(slide, text, opts = {}) {
  slide.addText(text.toUpperCase(), {
    x: opts.x ?? 0.9, y: opts.y ?? 0.6, w: opts.w ?? 12, h: 0.42,
    fontFace: FONT, fontSize: 14.5, bold: true, color: opts.color ?? TEAL,
    charSpacing: 2, align: "left",
  });
}

function title(slide, text, opts = {}) {
  slide.addText(text, {
    x: opts.x ?? 0.9, y: opts.y ?? 1.1, w: opts.w ?? 18.2, h: opts.h ?? 1.05,
    fontFace: FONT, fontSize: opts.size ?? 44, bold: true, color: opts.color ?? DARKGREEN,
    align: "left",
  });
}

function headerLogo(slide, dark) {
  // "Simplificado" lockup, small, top-right — per brand guideline (30px tall)
  slide.addImage({ path: A(dark ? "logo_simple_dark.png" : "logo_simple_light.png"), x: PW - 2.55, y: 0.55, w: 2.1, h: 0.336 });
}

function footer(slide, n, dark) {
  const lineColor = dark ? "1F4B47" : "D7E3DA";
  const textColor = dark ? "6F958D" : GRAY;
  slide.addShape("line", { x: 0.9, y: PH - 0.62, w: PW - 1.8, h: 0, line: { color: lineColor, width: 0.75 } });
  slide.addText("Ekotruck — Grupo WLM", { x: 0.9, y: PH - 0.5, w: 6, h: 0.35, fontFace: FONT, fontSize: 11.5, color: textColor });
  slide.addText(String(n), { x: PW - 1.4, y: PH - 0.5, w: 0.5, h: 0.35, align: "right", fontFace: FONT, fontSize: 11.5, color: textColor });
}

function decisionBadge(slide, x = 0.9, y = 0.58) {
  slide.addShape("roundRect", { x, y, w: 3.6, h: 0.58, rectRadius: 0.29, fill: { color: ORANGE }, line: { type: "none" } });
  slide.addText("PONTO DE DECISÃO", {
    x, y, w: 3.6, h: 0.58, align: "center", valign: "middle",
    fontFace: FONT, fontSize: 14.5, bold: true, color: WHITE, charSpacing: 1.5,
  });
}

// Card with a thin orange top accent to mark it as the "card em foco" — brand pattern
function focusCard(slide, { x, y, w, h, fill = CARD_DARK, radius = 0.09 }) {
  slide.addShape("roundRect", { x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { type: "none" } });
  slide.addShape("roundRect", { x, y, w, h: 0.07, rectRadius: 0, fill: { color: ORANGE }, line: { type: "none" } });
}

function vArrow(slide, { x, y1, y2, color = MINT }) {
  slide.addShape("line", { x, y: y1, w: 0, h: y2 - y1, line: { color, width: 2.25, endArrowType: "triangle" } });
}

// ============================================================
// Slide 1 — Capa
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: DARKGREEN };
  // Filete laranja da capa
  s.addShape("rect", { x: 0, y: 0, w: 0.14, h: PH, fill: { color: ORANGE }, line: { type: "none" } });

  s.addImage({ path: A("logo_full_dark.png"), x: 0.9, y: 0.75, w: 2.8, h: 0.626 });

  s.addText("PLANEJAMENTO ESTRATÉGICO", {
    x: 0.9, y: 3.7, w: 14, h: 0.5, fontFace: FONT, fontSize: 17, bold: true, color: MINT, charSpacing: 3,
  });
  s.addText("Engenharia e Qualidade", {
    x: 0.85, y: 4.2, w: 16, h: 1.5, fontFace: FONT, fontSize: 52, bold: true, color: WHITE,
  });
  s.addText("Garantia, Remanufatura e Desmonte", {
    x: 0.9, y: 5.4, w: 16, h: 0.7, fontFace: FONT, fontSize: 25, color: MINT,
  });

  s.addShape("line", { x: 0.9, y: 9.15, w: PW - 1.8, h: 0, line: { color: "1F4B47", width: 1 } });
  s.addText("Andre Pavan Eiras — Gerente de Engenharia e Qualidade", {
    x: 0.9, y: 9.35, w: 12, h: 0.4, fontFace: FONT, fontSize: 16, color: WHITE,
  });
  s.addText("Ekotruck — Grupo WLM  |  Agosto de 2026", {
    x: 0.9, y: 9.78, w: 12, h: 0.4, fontFace: FONT, fontSize: 15, color: "8FB0A6",
  });
  s.addNotes("Abertura institucional. Reforçar que o memorando enviado antes da reunião cobre o contexto completo — esta apresentação conduz a conversa e apoia decisão, não reexplica o que já foi lido.\n⏱ Bloco: 1 min | Acumulado: 0:01 de 1h30");
}

// ============================================================
// Slide 2 — Onde estamos hoje
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  headerLogo(s, false);
  kicker(s, "Mapa da reunião");
  title(s, "Onde estamos hoje");

  const cards = [
    { iconName: "bi_desmonte", label: "CDV Lavras", text: "1 veículo a cada 11 dias corridos — abaixo da meta de 1/semana. Gargalo em limpeza e catalogação." },
    { iconName: "bi_vendapecas", label: "Comercial", text: "Bom desempenho em componentes maiores; caso à parte: cabines G14, giro de 5 meses." },
    { iconName: "bi_motores", label: "Reman", text: "Área ainda não formalizada. 3 oportunidades já validadas e 2 vagas em aberto." },
    { iconName: "ci_warning", label: "Riscos transversais", text: "Motor a base de troca: risco documental identificado, ainda sem ocorrência registrada." },
  ];
  const gx = 0.9, gy = 2.8, gw = 8.85, gh = 3.3, gap = 0.5;
  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (gw + gap), y = gy + row * (gh + gap);
    s.addShape("roundRect", { x, y, w: gw, h: gh, rectRadius: 0.1, fill: { color: LIGHT }, line: { type: "none" } });
    iconCircle(s, { x: x + 0.5, y: y + 0.42, d: 0.9, circleColor: TEAL, name: c.iconName, color: "white" });
    s.addText(c.label, { x: x + 1.65, y: y + 0.42, w: gw - 2, h: 0.7, fontFace: FONT, fontSize: 23, bold: true, color: DARKGREEN, valign: "middle" });
    s.addText(c.text, { x: x + 0.5, y: y + 1.5, w: gw - 1.0, h: gh - 1.8, fontFace: FONT, fontSize: 16.5, color: GRAY, valign: "top", lineSpacingMultiple: 1.22 });
  });
  footer(s, 2, false);
  s.addNotes("Este slide é o mapa para o resto da reunião — as quatro frentes que vamos percorrer. Não detalhar ainda, só situar.\n⏱ Bloco: 6 min | Acumulado: 0:07 de 1h30");
}

// ============================================================
// Slide 3 — CDV Lavras: como funciona o processo (diagrama)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  headerLogo(s, false);
  kicker(s, "CDV Lavras — 1 de 3");
  title(s, "CDV Lavras — Como funciona o processo");

  // Step 1: desmonte (centered)
  s.addShape("roundRect", { x: 6, y: 2.55, w: 8, h: 1.05, rectRadius: 0.1, fill: { color: DARKGREEN }, line: { type: "none" } });
  iconCircle(s, { x: 6.28, y: 2.72, d: 0.72, circleColor: TEAL, name: "bi_desmonte", color: "white" });
  s.addText("1. Desmonte do caminhão", { x: 7.2, y: 2.68, w: 6.6, h: 0.42, fontFace: FONT, fontSize: 16.5, bold: true, color: WHITE });
  s.addText("2 dias — etapa já eficiente. Quando cabível, inclui o macrocomponente.", { x: 7.2, y: 3.1, w: 6.6, h: 0.45, fontFace: FONT, fontSize: 12.5, color: MINT, valign: "top" });

  // connector down + branch
  vArrow(s, { x: 10, y1: 3.6, y2: 3.95, color: TEAL });
  const flows = [
    { iconName: "bi_estoque", t: "Geral", d: "Itens sem tratamento especial seguem direto para catalogação." },
    { iconName: "bi_inspecao", t: "Eletrônicos", d: "Limpeza fina (mini-retíficas, jato de ar, discos de borracha) → estoque trancado." },
    { iconName: "bi_cambios", t: "Motor / Câmbio", d: "Lavagem bruta (desengraxante + água quente) → avaliação do mecânico define o que remanufaturar." },
    { iconName: "bi_oficina", t: "Cabines", d: "Limpeza fina e polimento de lataria." },
  ];
  const fw = 4.35, fx0 = 0.9, fgap = 0.35, fy = 4.55, fh = 2.15;
  const centers = flows.map((_, i) => fx0 + fw / 2 + i * (fw + fgap));
  s.addShape("line", { x: centers[0], y: 3.95, w: centers[3] - centers[0], h: 0, line: { color: MINT, width: 2.25 } });
  centers.forEach((cx) => vArrow(s, { x: cx, y1: 3.95, y2: fy, color: MINT }));

  flows.forEach((f, i) => {
    const x = fx0 + i * (fw + fgap);
    s.addShape("roundRect", { x, y: fy, w: fw, h: fh, rectRadius: 0.09, fill: { color: LIGHT }, line: { type: "none" } });
    iconCircle(s, { x: x + 0.28, y: fy + 0.26, d: 0.62, circleColor: TEAL, name: f.iconName, color: "white" });
    s.addText(f.t, { x: x + 0.28, y: fy + 1.0, w: fw - 0.56, h: 0.42, fontFace: FONT, fontSize: 15.5, bold: true, color: DARKGREEN });
    s.addText(f.d, { x: x + 0.28, y: fy + 1.42, w: fw - 0.56, h: fh - 1.6, fontFace: FONT, fontSize: 11.5, color: GRAY, valign: "top", lineSpacingMultiple: 1.15 });
  });

  // converge down
  const convergeY = fy + fh + 0.35;
  centers.forEach((cx) => vArrow(s, { x: cx, y1: fy + fh, y2: convergeY, color: MINT }));
  s.addShape("line", { x: centers[0], y: convergeY, w: centers[3] - centers[0], h: 0, line: { color: MINT, width: 2.25 } });
  vArrow(s, { x: 10, y1: convergeY, y2: convergeY + 0.35, color: TEAL });

  const finalY = convergeY + 0.35;
  s.addShape("roundRect", { x: 5, y: finalY, w: 10, h: 0.95, rectRadius: 0.1, fill: { color: TEAL }, line: { type: "none" } });
  iconCircle(s, { x: 5.25, y: finalY + 0.14, d: 0.66, circleColor: DARKGREEN, name: "bi_armazenamento", color: "white" });
  s.addText("Catalogação (part number + sistema) → Armazenamento", {
    x: 6.15, y: finalY, w: 8.6, h: 0.95, valign: "middle", fontFace: FONT, fontSize: 15.5, bold: true, color: WHITE,
  });

  s.addText("Vagas abertas: 3 Auxiliares Administrativos + 1 Estagiário de Engenharia Mecânica/Produção. Uma vaga de auxiliar vai para a expedição (hoje sem responsável formal) — reduz o ganho líquido de capacidade. O estagiário não entra na conta de capacidade operacional: seu foco é POPs, metodologia de qualidade e melhoria de processo.", {
    x: 0.9, y: finalY + 1.15, w: 18.2, h: 1.1, fontFace: FONT, fontSize: 13, color: GRAY, valign: "top", lineSpacingMultiple: 1.2,
  });
  footer(s, 3, false);
  s.addNotes("Slide novo — visão operacional completa do processo de CDV em formato de diagrama, incluindo os quatro fluxos e a situação das novas contratações. Serve de base para o slide de diagnóstico do gargalo, que vem a seguir.\n⏱ Bloco: 7 min | Acumulado: 0:14 de 1h30");
}

// ============================================================
// Slide 4 — CDV Lavras: diagnóstico do gargalo
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  headerLogo(s, false);
  kicker(s, "CDV Lavras — 2 de 3");
  title(s, "CDV Lavras — Diagnóstico do gargalo");

  s.addShape("roundRect", { x: 0.9, y: 2.5, w: 5.4, h: 1.75, rectRadius: 0.1, fill: { color: LIGHT }, line: { type: "none" } });
  s.addText("META", { x: 0.9, y: 2.65, w: 5.4, h: 0.32, align: "center", fontFace: FONT, fontSize: 12, bold: true, color: GRAY, charSpacing: 1.5 });
  s.addText("1 / semana", { x: 0.9, y: 2.95, w: 5.4, h: 0.75, align: "center", fontFace: FONT, fontSize: 28, bold: true, color: DARKGREEN });
  s.addText("veículo processado", { x: 0.9, y: 3.75, w: 5.4, h: 0.4, align: "center", fontFace: FONT, fontSize: 12.5, color: GRAY });

  s.addShape("roundRect", { x: 6.6, y: 2.5, w: 5.4, h: 1.75, rectRadius: 0.1, fill: { color: TEAL }, line: { type: "none" } });
  s.addText("ATUAL", { x: 6.6, y: 2.65, w: 5.4, h: 0.32, align: "center", fontFace: FONT, fontSize: 12, bold: true, color: MINT, charSpacing: 1.5 });
  s.addText("11 dias", { x: 6.6, y: 2.95, w: 5.4, h: 0.75, align: "center", fontFace: FONT, fontSize: 28, bold: true, color: WHITE });
  s.addText("por veículo (corridos)", { x: 6.6, y: 3.75, w: 5.4, h: 0.4, align: "center", fontFace: FONT, fontSize: 12.5, color: LIGHT });

  s.addShape("roundRect", { x: 12.3, y: 2.5, w: 6.8, h: 1.75, rectRadius: 0.1, fill: { color: LIGHT }, line: { type: "none" } });
  s.addText("CICLO REAL DE TRABALHO", { x: 12.65, y: 2.65, w: 6, h: 0.32, fontFace: FONT, fontSize: 12, bold: true, color: GRAY, charSpacing: 1.5 });
  s.addText("7–8 dias úteis", { x: 12.65, y: 2.95, w: 6, h: 0.6, fontFace: FONT, fontSize: 21, bold: true, color: DARKGREEN });
  s.addText("Desmonte físico já é eficiente: 2 dias.", { x: 12.65, y: 3.55, w: 6, h: 0.6, fontFace: FONT, fontSize: 12, color: GRAY, valign: "top" });

  s.addShape("roundRect", { x: 0.9, y: 4.55, w: 18.2, h: 1.05, rectRadius: 0.08, fill: { color: "FCEEE0" }, line: { type: "none" } });
  s.addText("O gargalo está em limpeza e catalogação (5–6 dias) — sustentadas hoje por um único assistente administrativo para os quatro fluxos do processo.", {
    x: 1.3, y: 4.55, w: 17.4, h: 1.05, valign: "middle", fontFace: FONT, fontSize: 19, bold: true, color: ORANGE,
  });

  s.addText("Isso muda com as vagas já abertas — mas não na mesma proporção para todos:", {
    x: 0.9, y: 5.9, w: 18.2, h: 0.5, fontFace: FONT, fontSize: 15.5, color: DARKGREEN,
  });

  const hires = [
    { iconName: "ci_person", t: "3 Auxiliares Administrativos", d: "Reforçam limpeza e catalogação nos quatro fluxos. Uma vaga será consumida pela expedição (hoje sem responsável formal) — reduz o ganho líquido de capacidade." },
    { iconName: "bi_inspecao", t: "1 Estagiário de Engenharia Mecânica/Produção", d: "Não entra na conta de capacidade operacional. Foco: desenvolver POPs, metodologia de análise de qualidade e propor melhorias de processo." },
  ];
  const cw = 8.85, cx0 = 0.9, cy = 6.5, gap = 0.5, ch = 2.55;
  hires.forEach((h, i) => {
    const x = cx0 + i * (cw + gap);
    s.addShape("roundRect", { x, y: cy, w: cw, h: ch, rectRadius: 0.1, fill: { color: LIGHT }, line: { type: "none" } });
    iconCircle(s, { x: x + 0.4, y: cy + 0.35, d: 0.8, circleColor: TEAL, name: h.iconName, color: "white" });
    s.addText(h.t, { x: x + 1.4, y: cy + 0.3, w: cw - 1.75, h: 0.9, fontFace: FONT, fontSize: 16.5, bold: true, color: DARKGREEN, valign: "top" });
    s.addText(h.d, { x: x + 0.4, y: cy + 1.35, w: cw - 0.8, h: ch - 1.6, fontFace: FONT, fontSize: 13, color: GRAY, valign: "top", lineSpacingMultiple: 1.2 });
  });

  s.addText("Aumentar headcount de forma genérica não resolve — a solução depende de como organizamos esses quatro fluxos.", {
    x: 0.9, y: 9.3, w: 18.2, h: 0.55, fontFace: FONT, fontSize: 14, italic: true, color: TEAL,
  });
  footer(s, 4, false);
  s.addNotes("Os quatro fluxos já foram detalhados no slide anterior — aqui o foco é a mensagem do gargalo e o que as novas contratações efetivamente mudam.\n⏱ Bloco: 8 min | Acumulado: 0:22 de 1h30");
}

// ============================================================
// Slide 5 — CDV Lavras: decisão em aberto (DECISÃO)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: DARKGREEN };
  headerLogo(s, true);
  decisionBadge(s);
  title(s, "CDV Lavras — Alocação das vagas de auxiliar", { color: WHITE, y: 1.35 });
  s.addText("Os quatro fluxos (geral, eletrônicos, motor/câmbio, cabines) têm ritmos diferentes de entrada e saída. Hoje um único assistente atende a todos, o que cria filas cruzadas e prioriza o fluxo mais urgente às custas dos demais. As 3 vagas de auxiliar mudam esse cenário — mas uma delas será consumida pela expedição (hoje sem responsável formal), o que reduz o ganho líquido de capacidade.", {
    x: 0.9, y: 2.5, w: 18.2, h: 1.5, fontFace: FONT, fontSize: 16, color: MINT, valign: "top", lineSpacingMultiple: 1.25,
  });

  const opts = [
    { t: "Especialização por fluxo", d: "Um auxiliar por fluxo (eletrônicos, motor/câmbio, cabines).", pro: "Mais throughput por pessoa" },
    { t: "Pool rotativo", d: "Auxiliares circulam entre fluxos conforme a demanda do dia.", pro: "Mais flexibilidade quando um fluxo esvazia" },
  ];
  const cw = 8.85, cx0 = 0.9, cy = 4.45, gap = 0.5;
  opts.forEach((o, i) => {
    const x = cx0 + i * (cw + gap);
    focusCard(s, { x, y: cy, w: cw, h: 3.7 });
    s.addText(o.t, { x: x + 0.5, y: cy + 0.45, w: cw - 1.0, h: 0.75, fontFace: FONT, fontSize: 24, bold: true, color: WHITE });
    s.addText(o.d, { x: x + 0.5, y: cy + 1.35, w: cw - 1.0, h: 1.05, fontFace: FONT, fontSize: 16, color: LIGHT, valign: "top", lineSpacingMultiple: 1.25 });
    s.addText("↳ " + o.pro, { x: x + 0.5, y: cy + 2.7, w: cw - 1.0, h: 0.7, fontFace: FONT, fontSize: 16.5, bold: true, color: ORANGE, valign: "top" });
  });

  s.addText("Recomendação: levar como ponto de discussão à diretoria — não como definição já fechada.", {
    x: 0.9, y: 8.4, w: 18.2, h: 0.55, fontFace: FONT, fontSize: 15, italic: true, color: MINT,
  });
  footer(s, 5, true);
  s.addNotes("Parar aqui e efetivamente ouvir a diretoria — este é um ponto de decisão, não de leitura de slide. Não antecipar a recomendação como se já fosse fato.\n⏱ Bloco: 6 min | Acumulado: 0:28 de 1h30");
}

// ============================================================
// Slide 6 — Comercial: papel e diferenciais
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  headerLogo(s, false);
  kicker(s, "Comercial — 1 de 2");
  title(s, "Comercial — Nosso papel e diferenciais");

  s.addText("Nosso papel: entregar os insumos que aumentam a chance de sucesso do time de vendas.", {
    x: 0.9, y: 2.45, w: 18.2, h: 0.5, fontFace: FONT, fontSize: 16.5, color: DARKGREEN,
  });
  const roleBullets = ["Dados de mercado", "Informação técnica de produto", "Argumentos comerciais que eles não teriam sozinhos"];
  const rbw = 5.87, rbx0 = 0.9, rbgap = 0.28;
  roleBullets.forEach((t, i) => {
    const x = rbx0 + i * (rbw + rbgap);
    s.addShape("roundRect", { x, y: 3.0, w: rbw, h: 0.75, rectRadius: 0.08, fill: { color: LIGHT }, line: { type: "none" } });
    s.addText("•  " + t, { x: x + 0.25, y: 3.0, w: rbw - 0.5, h: 0.75, valign: "middle", fontFace: FONT, fontSize: 13.5, bold: true, color: DARKGREEN });
  });

  const diffs = [
    { iconName: "bi_rastreio", t: "Procedência Scania", d: "Atestado natural de origem para quem compra usado dentro de uma concessionária." },
    { iconName: "bi_garantia", t: "Garantia estendida", d: "6 a 12 meses, conforme o item — o mercado pratica apenas 3 meses." },
  ];
  const cw = 8.85, cx0 = 0.9, cy = 4.05, gap = 0.5, ch = 1.85;
  diffs.forEach((d, i) => {
    const x = cx0 + i * (cw + gap);
    s.addShape("roundRect", { x, y: cy, w: cw, h: ch, rectRadius: 0.1, fill: { color: LIGHT }, line: { type: "none" } });
    iconCircle(s, { x: x + 0.35, y: cy + 0.3, d: 0.72, circleColor: TEAL, name: d.iconName, color: "white" });
    s.addText(d.t, { x: x + 1.3, y: cy + 0.25, w: cw - 1.6, h: 0.55, fontFace: FONT, fontSize: 18, bold: true, color: DARKGREEN, valign: "middle" });
    s.addText(d.d, { x: x + 0.35, y: cy + 1.05, w: cw - 0.7, h: ch - 1.2, fontFace: FONT, fontSize: 12.5, color: GRAY, valign: "top", lineSpacingMultiple: 1.15 });
  });

  s.addText("Como precificamos", { x: 0.9, y: 6.15, w: 10, h: 0.45, fontFace: FONT, fontSize: 17, bold: true, color: DARKGREEN });

  const pcw = 8.85, pcx0 = 0.9, pcgap = 0.5, pcy = 6.75, pch = 3.35;
  const priceCol = { t: "Preços", items: [
    "3 níveis de preço para todo o catálogo: sugerido, mínimo e referência de peça nova",
    "Quantidade disponível de cada item",
    "Piso e preço sugerido definidos por nós — controle direto sobre a margem",
  ]};
  const materialCol = { t: "Materiais técnicos (itens de alto valor)", items: [
    "Cartilha técnica com a composição do item",
    "Configurações de venda possíveis",
    "Avaliação de qualidade e manutenção documentada",
  ]};
  [priceCol, materialCol].forEach((col, i) => {
    const x = pcx0 + i * (pcw + pcgap);
    s.addShape("roundRect", { x, y: pcy, w: pcw, h: pch, rectRadius: 0.1, fill: { color: LIGHT }, line: { type: "none" } });
    s.addText(col.t, { x: x + 0.4, y: pcy + 0.3, w: pcw - 0.8, h: 0.6, fontFace: FONT, fontSize: 15.5, bold: true, color: TEAL, valign: "top" });
    const body = col.items.map((it, idx) => ({ text: it, options: { bullet: { code: "2022", indent: 16 }, breakLine: idx < col.items.length - 1, color: DARKGREEN, fontSize: 13.5 } }));
    s.addText(body, { x: x + 0.4, y: pcy + 1.0, w: pcw - 0.8, h: pch - 1.3, fontFace: FONT, valign: "top", lineSpacingMultiple: 1.2, paraSpaceAfter: 8 });
  });
  footer(s, 6, false);
  s.addNotes("Reforçar limite de papel: fornecemos vantagem, não gerenciamos comercial. Este slide prepara o terreno para os KPIs do próximo.\n⏱ Bloco: 8 min | Acumulado: 0:36 de 1h30");
}

// ============================================================
// Slide 7 — Comercial: KPIs principais
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  headerLogo(s, false);
  kicker(s, "Comercial — 2 de 2");
  title(s, "Comercial — Indicadores principais");

  s.addText("Do conjunto de 10 KPIs propostos (detalhamento completo no memorando), estes quatro orientam a primeira fase — dois de qualidade/insumo, dois de conversão.", {
    x: 0.9, y: 2.55, w: 18.2, h: 0.75, fontFace: FONT, fontSize: 16, color: GRAY, valign: "top", lineSpacingMultiple: 1.2,
  });

  const kpis = [
    { n: "1", cat: "Qualidade / Insumo", t: "% de itens de alto valor com cartilha técnica completa na data de disponibilização", prazo: "Dez/26" },
    { n: "2", cat: "Qualidade / Insumo", t: "Tempo médio entre catalogação e disponibilização de preço/cartilha", prazo: "Dez/26" },
    { n: "7", cat: "Conversão", t: "Faturamento mensal por família de item", prazo: "Dez/26" },
    { n: "10", cat: "Conversão", t: "Giro de estoque parado acima de X dias (capital morto)", prazo: "Dez/26" },
  ];
  const rw = 18.2, rx = 0.9, ry0 = 3.6, rh = 1.32, gap = 0.2;
  kpis.forEach((k, i) => {
    const y = ry0 + i * (rh + gap);
    s.addShape("roundRect", { x: rx, y, w: rw, h: rh, rectRadius: 0.08, fill: { color: i % 2 === 0 ? LIGHT : WHITE }, line: i % 2 === 0 ? { type: "none" } : { color: LIGHT, width: 1 } });
    s.addShape("ellipse", { x: rx + 0.4, y: y + rh / 2 - 0.36, w: 0.72, h: 0.72, fill: { color: TEAL }, line: { type: "none" } });
    s.addText(k.n, { x: rx + 0.4, y: y + rh / 2 - 0.36, w: 0.72, h: 0.72, align: "center", valign: "middle", fontFace: FONT, fontSize: 20, bold: true, color: WHITE });
    s.addText(k.t, { x: rx + 1.5, y: y + 0.14, w: 13.0, h: rh - 0.28, fontFace: FONT, fontSize: 17, bold: true, color: DARKGREEN, valign: "middle", lineSpacingMultiple: 1.08 });
    s.addText(k.cat, { x: rx + 14.7, y: y + 0.14, w: 2.05, h: rh - 0.28, fontFace: FONT, fontSize: 13, color: TEAL, valign: "middle" });
    s.addText(k.prazo, { x: rx + 16.7, y: y + 0.14, w: 1.2, h: rh - 0.28, fontFace: FONT, fontSize: 16, bold: true, color: ORANGE, valign: "middle", align: "right" });
  });
  footer(s, 7, false);
  s.addNotes("Os 10 KPIs completos ficam no memorando — não reabrir a lista aqui. Retrabalho de garantia (KPI 4) foi deliberadamente deixado fora do grupo principal nesta fase de experimentação da Reman, se perguntarem.\n⏱ Bloco: 5 min | Acumulado: 0:41 de 1h30");
}

// ============================================================
// Slide 8 — Investimento e estoque
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  headerLogo(s, false);
  kicker(s, "Capital e estoque");
  title(s, "Investimento e estoque — Regra por categoria de giro");

  s.addShape("roundRect", { x: 0.9, y: 2.55, w: 5.2, h: 1.7, rectRadius: 0.1, fill: { color: DARKGREEN }, line: { type: "none" } });
  iconCircle(s, { x: 1.2, y: 2.85, d: 0.75, circleColor: TEAL, name: "bi_economiacusto", color: "white" });
  s.addText("~R$ 1 milhão/mês", { x: 2.15, y: 2.8, w: 3.8, h: 0.55, fontFace: FONT, fontSize: 22, bold: true, color: WHITE });
  s.addText("4 caminhões/mês em ritmo pleno", { x: 2.15, y: 3.35, w: 3.8, h: 0.7, fontFace: FONT, fontSize: 13, color: MINT, valign: "top" });

  s.addText("Compramos caminhões inteiros — não peças avulsas. A regra abaixo é sobre como gerenciamos o estoque de peças resultante do desmonte, por categoria de giro.", {
    x: 6.5, y: 2.6, w: 12.6, h: 1.6, fontFace: FONT, fontSize: 16, color: DARKGREEN, valign: "top", lineSpacingMultiple: 1.25,
  });

  const cats = [
    { t: "Alto giro, ticket alto", d: "Câmbio (~1 mês), motor completo (~1,5 mês)", rule: "Sem teto de estoque — escoa na mesma velocidade em que é desmontado" },
    { t: "Giro lento, ticket alto", d: "Cabines (~5 meses de giro)", rule: "Teto físico: nunca mais de 2 cabines inteiras em estoque simultâneas" },
    { t: "Giro contínuo, ticket baixo", d: "Freios, suspensão, tanques", rule: "Problema operacional (espaço/mão de obra), não financeiro" },
  ];
  const cw = 5.8, cx0 = 0.9, cy = 4.75, gap = 0.32, ch = 3.05;
  cats.forEach((c, i) => {
    const x = cx0 + i * (cw + gap);
    s.addShape("roundRect", { x, y: cy, w: cw, h: ch, rectRadius: 0.1, fill: { color: LIGHT }, line: { type: "none" } });
    s.addText(c.t, { x: x + 0.4, y: cy + 0.35, w: cw - 0.8, h: 0.8, fontFace: FONT, fontSize: 18, bold: true, color: DARKGREEN, valign: "top" });
    s.addText(c.d, { x: x + 0.4, y: cy + 1.2, w: cw - 0.8, h: 0.55, fontFace: FONT, fontSize: 14, italic: true, color: GRAY });
    s.addText(c.rule, { x: x + 0.4, y: cy + 1.85, w: cw - 0.8, h: 1.05, fontFace: FONT, fontSize: 15, color: TEAL, valign: "top", lineSpacingMultiple: 1.2 });
  });

  s.addShape("roundRect", { x: 0.9, y: 8.2, w: 18.2, h: 1.15, rectRadius: 0.08, fill: { color: LIGHT }, line: { type: "none" } });
  iconCircle(s, { x: 1.2, y: 8.4, d: 0.75, circleColor: DARKGREEN, name: "bi_estoque", color: "white" });
  s.addText("Exemplo em curso: cabines Scania NTG G14 — mercado restrito, 4 unidades em estoque. Já iniciamos o desmonte de duas para venda em peças menores; propomos formalizar como política padrão.", {
    x: 2.15, y: 8.2, w: 16.6, h: 1.15, valign: "middle", fontFace: FONT, fontSize: 15, color: DARKGREEN, lineSpacingMultiple: 1.2,
  });
  footer(s, 8, false);
  s.addNotes("G14 é o caso concreto que ilustra a regra de giro lento — usar para tornar a categoria tangível antes de seguir. Deixar claro que a compra é de caminhões inteiros, não de peças avulsas.\n⏱ Bloco: 8 min | Acumulado: 0:49 de 1h30");
}

// ============================================================
// Slide 9 — Motor a base de troca: risco documental (DECISÃO)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: DARKGREEN };
  headerLogo(s, true);
  decisionBadge(s);
  title(s, "Motor a base de troca — Risco documental", { color: WHITE, y: 1.35 });

  s.addText("O motor vendido precisa ser formalmente adicionado ao documento do veículo para liberar o motor antigo para revenda. Hoje só comunicamos o cliente — sem apoio ativo nem contrato formal. Se o processo não for concluído, o motor antigo fica preso.", {
    x: 0.9, y: 2.5, w: 18.2, h: 1.25, fontFace: FONT, fontSize: 17, color: MINT, valign: "top", lineSpacingMultiple: 1.25,
  });
  s.addText("Risco antecipado, sem ocorrência registrada até o momento — o momento certo de estruturar é agora, antes de escalar o volume.", {
    x: 0.9, y: 3.85, w: 18.2, h: 0.55, fontFace: FONT, fontSize: 16, italic: true, color: ORANGE,
  });

  const layers = [
    { iconName: "ci_document", t: "Cláusula contratual", d: "Prazo explícito (ex: 30 dias) para comprovação, com garantia suspensa até então." },
    { iconName: "ci_person", t: "Indicação de despachante", d: "Reduz a fricção — hoje o cliente precisa descobrir o processo sozinho." },
    { iconName: "ci_scale", t: "Retenção financeira", d: "Título a receber, cancelado somente mediante comprovação da atualização." },
  ];
  const cw = 5.8, cx0 = 0.9, cy = 4.75, gap = 0.32, ch = 3.55;
  layers.forEach((l, i) => {
    const x = cx0 + i * (cw + gap);
    focusCard(s, { x, y: cy, w: cw, h: ch });
    iconCircle(s, { x: x + cw / 2 - 0.45, y: cy + 0.45, d: 0.9, circleColor: ORANGE, name: l.iconName, color: "white" });
    s.addText(l.t, { x: x + 0.3, y: cy + 1.55, w: cw - 0.6, h: 0.7, align: "center", fontFace: FONT, fontSize: 18, bold: true, color: WHITE });
    s.addText(l.d, { x: x + 0.4, y: cy + 2.3, w: cw - 0.8, h: 1.15, align: "center", fontFace: FONT, fontSize: 14.5, color: LIGHT, valign: "top", lineSpacingMultiple: 1.2 });
  });
  s.addText("As três camadas não são excludentes — ponto de decisão para a diretoria.", {
    x: 0.9, y: 8.65, w: 18.2, h: 0.5, fontFace: FONT, fontSize: 15, italic: true, color: MINT,
  });
  footer(s, 9, true);
  s.addNotes("Este é um dos quatro pontos de decisão — não seguir apresentando sem confirmar direção da diretoria sobre as camadas.\n⏱ Bloco: 10 min | Acumulado: 0:59 de 1h30");
}

// ============================================================
// Slide 10 — Reman: oportunidades validadas e funil
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  headerLogo(s, false);
  kicker(s, "Reman — 1 de 3");
  title(s, "Reman — Oportunidades validadas e funil");

  s.addShape("roundRect", { x: 0.9, y: 2.5, w: 18.2, h: 0.85, rectRadius: 0.08, fill: { color: "FCEEE0" }, line: { type: "none" } });
  s.addText("Não partimos de uma ideia vaga — três oportunidades já foram validadas diretamente pelo gestor da área nos últimos meses.", {
    x: 1.3, y: 2.5, w: 17.4, h: 0.85, valign: "middle", fontFace: FONT, fontSize: 17, bold: true, color: ORANGE,
  });

  const cases = [
    { t: "Bomba de ARLA", d: "Reparo já praticado no mercado externo — reduz risco de entrada." },
    { t: "Servo ECA", d: "Reparo já praticado no mercado externo — reduz risco de entrada." },
    { t: "Retarder", d: "Descoberta interna: custo de remanufatura ~R$4,5K vs. venda a R$12K." },
  ];
  const cw = 5.8, cx0 = 0.9, cy = 3.6, gap = 0.32, ch = 2.1;
  cases.forEach((c, i) => {
    const x = cx0 + i * (cw + gap);
    const hl = i === 2;
    s.addShape("roundRect", { x, y: cy, w: cw, h: ch, rectRadius: 0.1, fill: { color: hl ? TEAL : LIGHT }, line: { type: "none" } });
    s.addText(c.t, { x: x + 0.35, y: cy + 0.25, w: cw - 0.7, h: 0.55, fontFace: FONT, fontSize: 19, bold: true, color: hl ? WHITE : DARKGREEN });
    s.addText(c.d, { x: x + 0.35, y: cy + 0.9, w: cw - 0.7, h: 1.05, fontFace: FONT, fontSize: 14, color: hl ? LIGHT : GRAY, valign: "top", lineSpacingMultiple: 1.2 });
  });

  const roadmapY = 6.0;
  const roadmap = [
    { badge: "FASE 2", t: "Baixo capex, mesma lógica de bancada", items: ["Laboratório de reparo eletrônico de módulos", "Sapatas de freio rebitadas vendidas em kit"] },
    { badge: "JÁ CONSOLIDADO", t: "Itens grandes seguem no fluxo de CDV", items: ["Motor, câmbio e diferenciais já têm mercado consolidado", "Continuam em CDV até a estruturação própria da Reman avançar"] },
  ];
  const rw = 8.85, rx0 = 0.9, rgap = 0.5, rh = 2.5;
  roadmap.forEach((r, i) => {
    const x = rx0 + i * (rw + rgap);
    s.addShape("roundRect", { x, y: roadmapY, w: rw, h: rh, rectRadius: 0.1, fill: { color: LIGHT }, line: { type: "none" } });
    s.addShape("roundRect", { x: x + 0.35, y: roadmapY + 0.3, w: 2.3, h: 0.45, rectRadius: 0.225, fill: { color: TEAL }, line: { type: "none" } });
    s.addText(r.badge, { x: x + 0.35, y: roadmapY + 0.3, w: 2.3, h: 0.45, align: "center", valign: "middle", fontFace: FONT, fontSize: 11, bold: true, color: WHITE, charSpacing: 1 });
    s.addText(r.t, { x: x + 0.35, y: roadmapY + 0.9, w: rw - 0.7, h: 0.55, fontFace: FONT, fontSize: 15.5, bold: true, color: DARKGREEN, valign: "top" });
    const body = r.items.map((it, idx) => ({ text: it, options: { bullet: { code: "2022", indent: 16 }, breakLine: idx < r.items.length - 1, color: GRAY, fontSize: 13 } }));
    s.addText(body, { x: x + 0.35, y: roadmapY + 1.5, w: rw - 0.7, h: rh - 1.7, fontFace: FONT, valign: "top", lineSpacingMultiple: 1.2, paraSpaceAfter: 6 });
  });

  s.addText("Gargalo de capital: investimento em maquinário e ferramental de bancada — pontual e escalável aos poucos, não uma decisão estrutural pesada como CDV.", {
    x: 0.9, y: 8.75, w: 18.2, h: 0.65, fontFace: FONT, fontSize: 14.5, italic: true, color: TEAL, valign: "top", lineSpacingMultiple: 1.2,
  });
  footer(s, 10, false);
  s.addNotes("Reman costuma vir por último e é o tema menos discutido até hoje com a diretoria — cuidar do ritmo aqui para não atropelar os 3 slides de Reman.\n⏱ Bloco: 7 min | Acumulado: 1:06 de 1h30");
}

// ============================================================
// Slide 11 — Reman: estrutura de vagas
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  headerLogo(s, false);
  kicker(s, "Reman — 2 de 3");
  title(s, "Reman — Estrutura de vagas");

  const roles = [
    { iconName: "ci_person", t: "Supervisor de Remanufatura", d: "Identifica oportunidade já validada por dado, desenvolve fornecedor terceiro e testa a venda — antes de avaliar primarização, item por item, no máximo 3 simultâneos.", badge: null },
    { iconName: "bi_oficina", t: "Consultor Técnico", d: "Perfil de aprendizado, opera os processos primarizados; no médio prazo pode se tornar referência técnica ou o futuro analista da área.", badge: null },
    { iconName: "bi_catalogo", t: "Analista de Desenvolvimento de Peças", d: "Amplia o pipeline validado por dados, apoiando o Supervisor quando ele assumir gestão de equipe. Pode ser o Consultor promovido ou nova contratação — decisão não automática.", badge: "AÇÃO FUTURA" },
  ];
  const cw = 5.87, cx0 = 0.9, cy = 2.75, gap = 0.28, ch = 4.6;
  roles.forEach((r, i) => {
    const x = cx0 + i * (cw + gap);
    s.addShape("roundRect", { x, y: cy, w: cw, h: ch, rectRadius: 0.1, fill: { color: LIGHT }, line: { type: "none" } });
    let contentTop = cy + 0.35;
    if (r.badge) {
      s.addShape("roundRect", { x: x + 0.35, y: contentTop, w: 2.1, h: 0.42, rectRadius: 0.21, fill: { color: ORANGE }, line: { type: "none" } });
      s.addText(r.badge, { x: x + 0.35, y: contentTop, w: 2.1, h: 0.42, align: "center", valign: "middle", fontFace: FONT, fontSize: 10.5, bold: true, color: WHITE, charSpacing: 1 });
      contentTop += 0.62;
    }
    iconCircle(s, { x: x + 0.35, y: contentTop, d: 0.8, circleColor: TEAL, name: r.iconName, color: "white" });
    s.addText(r.t, { x: x + 0.35, y: contentTop + 0.95, w: cw - 0.7, h: 0.85, fontFace: FONT, fontSize: 17, bold: true, color: DARKGREEN, valign: "top" });
    s.addText(r.d, { x: x + 0.35, y: contentTop + 1.75, w: cw - 0.7, h: ch - (contentTop - cy) - 1.95, fontFace: FONT, fontSize: 12.5, color: GRAY, valign: "top", lineSpacingMultiple: 1.2 });
  });

  s.addText("Gatilho para contratação do analista de Reman: ponto de revisão em 6 meses — não decisão automática.", {
    x: 0.9, y: 7.65, w: 18.2, h: 0.55, fontFace: FONT, fontSize: 16, italic: true, color: TEAL,
  });
  footer(s, 11, false);
  s.addNotes("Cargo 3 é o pró-ativo destaque de 'ação futura' — não é vaga aberta agora, é o horizonte de 6 meses. Não aprofundar hierarquia dos dois primeiros além do mandato em uma frase.\n⏱ Bloco: 5 min | Acumulado: 1:11 de 1h30");
}

// ============================================================
// Slide 12 — Reman: análise SWOT
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  headerLogo(s, false);
  kicker(s, "Reman — 3 de 3");
  title(s, "Reman — Análise SWOT");

  const quads = [
    { t: "Forças", color: TEAL, items: ["3 oportunidades já validadas com dados reais", "Retarder: economia comprovada (R$4,5K vs. R$12K)", "Pipeline técnico já mapeado em fases"] },
    { t: "Fraquezas", color: GRAY, items: ["Equipe nova, sem processos formais ainda", "Gap de maturidade técnica entre Supervisor e Consultor"] },
    { t: "Oportunidades", color: TEAL, items: ["ARLA e Servo ECA com mercado de reparo já validado externamente", "Expansão de baixo capex — Fase 2 eletrônicos"] },
    { t: "Ameaças", color: ORANGE, items: ["Capex de bancada pode escalar sem priorização disciplinada", "Risco de atrito de liderança por diferença de maturidade"] },
  ];
  const gw = 8.85, gh = 3.15, gx = 0.9, gy = 2.75, gap = 0.45;
  quads.forEach((q, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (gw + gap), y = gy + row * (gh + gap);
    s.addShape("roundRect", { x, y, w: gw, h: gh, rectRadius: 0.1, fill: { color: LIGHT }, line: { type: "none" } });
    s.addShape("roundRect", { x: x + 0.4, y: y + 0.35, w: 2.6, h: 0.55, rectRadius: 0.275, fill: { color: q.color }, line: { type: "none" } });
    s.addText(q.t, { x: x + 0.4, y: y + 0.35, w: 2.6, h: 0.55, align: "center", valign: "middle", fontFace: FONT, fontSize: 15.5, bold: true, color: WHITE });
    const body = q.items.map((it, idx) => ({ text: it, options: { bullet: { code: "2022", indent: 18 }, breakLine: idx < q.items.length - 1, color: DARKGREEN, fontSize: 15.5 } }));
    s.addText(body, { x: x + 0.4, y: y + 1.15, w: gw - 0.8, h: gh - 1.45, fontFace: FONT, valign: "top", lineSpacingMultiple: 1.2, paraSpaceAfter: 8 });
  });
  footer(s, 12, false);
  s.addNotes("Versão resumida — 2 a 3 pontos por quadrante; a matriz completa (4x4) está no memorando.\n⏱ Bloco: 4 min | Acumulado: 1:15 de 1h30");
}

// ============================================================
// Slide 13 — Pontos de decisão consolidados (DECISÃO)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: DARKGREEN };
  headerLogo(s, true);
  decisionBadge(s);
  title(s, "4 pontos de decisão para a diretoria", { color: WHITE, y: 1.35 });

  const points = [
    { iconName: "bi_desmonte", t: "CDV", d: "Critério de alocação das vagas de auxiliar administrativo — especialização por fluxo vs. pool rotativo." },
    { iconName: "ci_document", t: "Motor a base de troca", d: "Camadas de solução para o risco documental: cláusula contratual, despachante e/ou título a receber." },
    { iconName: "bi_armazenamento", t: "Investimento", d: "Confirmar orçamento (~R$1 milhão/mês) e política de teto de estoque físico para giro lento (cabines)." },
    { iconName: "bi_motores", t: "Reman", d: "Abertura das duas vagas (Supervisor e Consultor) e faixa de orçamento inicial para maquinário/ferramental." },
  ];
  const rw = 18.2, rx = 0.9, ry0 = 2.75, rh = 1.55, gap = 0.22;
  points.forEach((p, i) => {
    const y = ry0 + i * (rh + gap);
    s.addShape("roundRect", { x: rx, y, w: rw, h: rh, rectRadius: 0.08, fill: { color: CARD_DARK }, line: { type: "none" } });
    iconCircle(s, { x: rx + 0.4, y: y + rh / 2 - 0.44, d: 0.88, circleColor: ORANGE, name: p.iconName, color: "white" });
    s.addText(p.t, { x: rx + 1.6, y: y + 0.16, w: 3.4, h: rh - 0.32, fontFace: FONT, fontSize: 19, bold: true, color: WHITE, valign: "middle" });
    s.addText(p.d, { x: rx + 5.15, y: y + 0.16, w: rw - 5.55, h: rh - 0.32, fontFace: FONT, fontSize: 15.5, color: LIGHT, valign: "middle", lineSpacingMultiple: 1.2 });
  });
  footer(s, 13, true);
  s.addNotes("Slide para retomar no fechamento da reunião — consolidar aqui as quatro decisões antes de seguir para o encerramento.\n⏱ Bloco: 7 min | Acumulado: 1:22 de 1h30");
}

// ============================================================
// Slide 14 — Encerramento
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: DARKGREEN };
  s.addImage({ path: A("logo_simple_dark.png"), x: PW - 2.9, y: 0.75, w: 2.4, h: 0.384 });

  s.addText("PRÓXIMOS PASSOS", { x: 0.9, y: 1.15, w: 8, h: 0.45, fontFace: FONT, fontSize: 16, bold: true, color: MINT, charSpacing: 2 });
  s.addText("Próximos passos", { x: 0.85, y: 1.65, w: 14, h: 1.2, fontFace: FONT, fontSize: 44, bold: true, color: WHITE });

  const steps = [
    { who: "Diretoria", what: "Posicionamento sobre os 4 pontos de decisão desta reunião" },
    { who: "Engenharia e Qualidade", what: "Formalizar critério de alocação em CDV e abrir processo seletivo Reman" },
    { who: "Jurídico / Comercial", what: "Apoiar minuta contratual do risco documental de motor a base de troca" },
    { who: "Engenharia e Qualidade", what: "Reportar os 10 indicadores até dezembro; revisão de Reman em 6 meses" },
  ];
  const rx = 0.9, ry0 = 3.55, rw = 18.2, rh = 1.35, gap = 0.2;
  steps.forEach((st, i) => {
    const y = ry0 + i * (rh + gap);
    s.addShape("roundRect", { x: rx, y, w: rw, h: rh, rectRadius: 0.08, fill: { color: CARD_DARK }, line: { type: "none" } });
    s.addText(st.who, { x: rx + 0.45, y, w: 4.4, h: rh, valign: "middle", fontFace: FONT, fontSize: 16.5, bold: true, color: MINT });
    s.addText(st.what, { x: rx + 5.1, y, w: rw - 5.6, h: rh, valign: "middle", fontFace: FONT, fontSize: 16, color: WHITE, lineSpacingMultiple: 1.15 });
  });
  footer(s, 14, true);
  s.addNotes("Fechar com quem faz o quê — deixar claro que a reunião termina com ações atribuídas, não só com temas discutidos.\n⏱ Bloco: 8 min | Acumulado: 1h30 (fim)");
}

pres.writeFile({ fileName: path.join(__dirname, "Planejamento_Estrategico_Engenharia_Qualidade.pptx") }).then(() => {
  console.log("done");
});
