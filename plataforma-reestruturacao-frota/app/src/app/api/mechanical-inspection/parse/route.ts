import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { createClient } from "@/lib/supabase/server";
import { parseBudgetPdf } from "@/lib/parseBudgetPdf";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // O PDF já foi enviado ao Storage pelo cliente (evita o limite de corpo de
  // requisição da função serverless, ~4,5 MB na Vercel, que causava HTTP
  // 413 em arquivos maiores) — aqui só recebemos o caminho e baixamos.
  const body = await request.json().catch(() => null);
  const path = body?.path;
  if (typeof path !== "string" || !path) {
    return NextResponse.json({ error: "Caminho do arquivo não informado." }, { status: 400 });
  }

  const { data: fileData, error: dlErr } = await supabase.storage.from("case-attachments").download(path);
  if (dlErr || !fileData) {
    return NextResponse.json({ error: "Não consegui baixar o PDF enviado." }, { status: 422 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const items = parseBudgetPdf(result.text);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Não consegui reconhecer itens de orçamento neste PDF. Confira se é o arquivo padrão." },
      { status: 422 }
    );
  }

  return NextResponse.json({ items });
}
