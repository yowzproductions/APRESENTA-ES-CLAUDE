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

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
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
