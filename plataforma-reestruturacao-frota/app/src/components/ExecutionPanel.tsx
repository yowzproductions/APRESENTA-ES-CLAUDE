"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ParsedBudgetItem } from "@/lib/parseBudgetPdf";
import { sanitizeFileName } from "@/lib/sanitizeFileName";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Máscara de dinheiro: cada dígito digitado entra na casa dos centavos,
// como em caixas eletrônicos (ex.: digitar "1234" vira R$ 12,34).
function parseCurrencyInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? 0 : parseInt(digits, 10) / 100;
}

type IncidentKind = "adicionado" | "removido";
type IncidentCategory = "peca" | "servico";
type PartBrand = "scania" | "ekotruck" | "ekotruck_spot";

function brandLabel(b: PartBrand) {
  if (b === "ekotruck") return "Ekotruck";
  if (b === "ekotruck_spot") return "Ekotruck Spot";
  return "Scania Original";
}

// Itens de mão de obra (linhas 90/92) entram como serviço; os demais, como
// peça — mesmo critério usado no restante do fluxo.
function isLaborLine(productLine: string) {
  return productLine === "90" || productLine === "92";
}

interface Incident {
  id: string;
  kind: IncidentKind;
  category: IncidentCategory;
  description: string;
  part_number: string;
  quantity: number;
  unit_price: number;
  cost: number;
  brand: PartBrand;
  supplier: string | null;
  budget_name: string | null;
}

// Item do rascunho do orçamento complementar (PDF analisado, ainda não
// salvo como imprevisto).
interface DraftItem extends ParsedBudgetItem {
  category: IncidentCategory;
  brand: PartBrand;
  supplier: string;
}

export function ExecutionPanel({
  caseId,
  onCompleted,
  disabled,
}: {
  caseId: string;
  onCompleted: () => Promise<void> | void;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [kind, setKind] = useState<IncidentKind>("adicionado");
  const [category, setCategory] = useState<IncidentCategory>("peca");
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [brand, setBrand] = useState<PartBrand>("scania");
  const [supplier, setSupplier] = useState("");

  // Rascunho do orçamento complementar (PDF de demanda não prevista surgida
  // durante a execução) sendo montado agora.
  const [budgetName, setBudgetName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [draftItems, setDraftItems] = useState<DraftItem[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("execution_incidents")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });
    setIncidents((data as Incident[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  function resetForm() {
    setDescription("");
    setPartNumber("");
    setQuantity(1);
    setUnitPrice(0);
    setBrand("scania");
    setSupplier("");
  }

  async function addIncident() {
    if (!description.trim()) {
      setError("Descreva o imprevisto.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cost = Math.round(quantity * unitPrice * 100) / 100;
    const { error: insErr } = await supabase.from("execution_incidents").insert({
      case_id: caseId,
      kind,
      category,
      description: description.trim(),
      part_number: category === "peca" ? partNumber.trim() || null : null,
      quantity,
      unit_price: unitPrice,
      cost,
      brand: category === "peca" ? brand : "scania",
      supplier: supplier.trim() || null,
      created_by: user?.id,
    });
    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }

    await supabase.from("activity_log").insert({
      case_id: caseId,
      actor_id: user?.id,
      actor_email: user?.email,
      stage: "em_execucao",
      action: kind === "adicionado" ? "imprevisto_adicionado" : "imprevisto_removido",
      description: `${kind === "adicionado" ? "Adicionou" : "Removeu"} o imprevisto de ${
        category === "peca" ? "peça" : "serviço"
      } "${description.trim()}" (${currency(cost)})${
        category === "peca" ? `, marca ${brandLabel(brand)}` : ""
      }${supplier.trim() ? `, fornecedor ${supplier.trim()}` : ""}.`,
    });

    resetForm();
    setSaving(false);
    await load();
  }

  async function removeIncident(incident: Incident) {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: delErr } = await supabase.from("execution_incidents").delete().eq("id", incident.id);
    if (delErr) {
      setError(delErr.message);
      setSaving(false);
      return;
    }

    await supabase.from("activity_log").insert({
      case_id: caseId,
      actor_id: user?.id,
      actor_email: user?.email,
      stage: "em_execucao",
      action: "imprevisto_excluido",
      description: `Excluiu o imprevisto "${incident.description}" (${currency(incident.cost)}).`,
    });

    setSaving(false);
    await load();
  }

  function resetDraftBudget() {
    setBudgetName("");
    setFile(null);
    setUploadedPath(null);
    setDraftItems(null);
  }

  async function analyzeComplementaryBudget() {
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const supabase = createClient();
      const path = `${caseId}/em_execucao/${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: upErr } = await supabase.storage.from("case-attachments").upload(path, file);
      if (upErr) {
        setError(upErr.message);
        return;
      }
      setUploadedPath(path);

      const res = await fetch("/api/mechanical-inspection/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      let data: { items?: ParsedBudgetItem[]; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // resposta não era JSON (ex.: erro 500 genérico do servidor)
      }
      if (!res.ok) {
        setError(data.error || `Erro ao ler o PDF (HTTP ${res.status}).`);
        return;
      }
      setDraftItems(
        (data.items ?? []).map((it) => ({
          ...it,
          category: isLaborLine(it.productLine) ? "servico" : "peca",
          brand: "scania" as PartBrand,
          supplier: "",
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar o PDF.");
    } finally {
      setParsing(false);
    }
  }

  function updateDraftItem(index: number, patch: Partial<DraftItem>) {
    setDraftItems((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const merged = { ...next[index], ...patch };
      if ("quantity" in patch || "unitPrice" in patch) {
        merged.totalPrice = Math.round(merged.quantity * merged.unitPrice * 100) / 100;
      }
      next[index] = merged;
      return next;
    });
  }

  function removeDraftItem(index: number) {
    setDraftItems((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  const draftTotal = draftItems?.reduce((s, it) => s + it.totalPrice, 0) ?? 0;

  async function saveComplementaryBudget() {
    setError(null);
    if (!budgetName.trim()) {
      setError('Dê um nome para este orçamento complementar (ex.: "Motor", "Câmbio") antes de salvar.');
      return;
    }
    if (!draftItems || draftItems.length === 0) {
      setError('Escolha o PDF e clique em "Analisar PDF" antes de salvar o orçamento.');
      return;
    }
    if (!uploadedPath) {
      setError("Não encontrei o PDF enviado — escolha o arquivo e clique em \"Analisar PDF\" novamente.");
      return;
    }
    setSavingBudget(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("attachments").insert({
        related_table: "return_cases",
        related_id: caseId,
        stage: "em_execucao",
        url: uploadedPath,
        uploaded_by: user?.id,
      });

      const name = budgetName.trim();
      const { error: insErr } = await supabase.from("execution_incidents").insert(
        draftItems.map((it) => ({
          case_id: caseId,
          kind: "adicionado" as IncidentKind,
          category: it.category,
          description: it.description,
          part_number: it.category === "peca" ? it.partNumber || null : null,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          cost: it.totalPrice,
          brand: it.category === "peca" ? it.brand : "scania",
          supplier: it.supplier.trim() || null,
          budget_name: name,
          created_by: user?.id,
        }))
      );
      if (insErr) {
        setError(insErr.message);
        return;
      }

      await supabase.from("activity_log").insert({
        case_id: caseId,
        actor_id: user?.id,
        actor_email: user?.email,
        stage: "em_execucao",
        action: "orcamento_complementar_anexado",
        description: `Anexou o orçamento complementar "${name}" com ${draftItems.length} item(ns), total ${currency(
          draftTotal
        )}.`,
      });

      resetDraftBudget();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado ao salvar o orçamento complementar.");
    } finally {
      setSavingBudget(false);
    }
  }

  const added = incidents.filter((i) => i.kind === "adicionado");
  const removed = incidents.filter((i) => i.kind === "removido");
  const addedTotal = added.reduce((s, i) => s + i.cost, 0);
  const removedTotal = removed.reduce((s, i) => s + i.cost, 0);
  const net = addedTotal - removedTotal;

  if (loading) {
    return <p className="text-sm text-ekotruck-gray">Carregando imprevistos...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ekotruck-gray">
        Manutenção sempre tem imprevistos: registre aqui a peça ou o serviço que precisou ser colocado ou tirado
        durante a execução, a qualquer momento — o impacto entra na conta final do veículo.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {incidents.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-ekotruck-darkGreen/10">
          <table className="w-full text-xs">
            <thead className="bg-ekotruck-darkGreen/5 text-left uppercase text-ekotruck-gray">
              <tr>
                <th className="px-2 py-1.5">Tipo</th>
                <th className="px-2 py-1.5">Categoria</th>
                <th className="px-2 py-1.5">Partnumber</th>
                <th className="px-2 py-1.5">Descrição</th>
                <th className="px-2 py-1.5">Qtde.</th>
                <th className="px-2 py-1.5">Preço Unit.</th>
                <th className="px-2 py-1.5">Custo</th>
                <th className="px-2 py-1.5">Marca / Fornecedor</th>
                <th className="px-2 py-1.5">Orçamento</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((it) => (
                <tr key={it.id} className="border-t border-ekotruck-darkGreen/10">
                  <td className="px-2 py-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        it.kind === "adicionado" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {it.kind === "adicionado" ? "Adicionado" : "Removido"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">{it.category === "peca" ? "Peça" : "Serviço"}</td>
                  <td className="px-2 py-1.5">{it.part_number || "-"}</td>
                  <td className="px-2 py-1.5">{it.description}</td>
                  <td className="px-2 py-1.5">{it.quantity}</td>
                  <td className="px-2 py-1.5">{currency(it.unit_price)}</td>
                  <td className="px-2 py-1.5">{currency(it.cost)}</td>
                  <td className="px-2 py-1.5">
                    {it.category === "peca" ? brandLabel(it.brand) : it.supplier || "-"}
                    {it.category === "peca" && it.supplier ? ` — ${it.supplier}` : ""}
                  </td>
                  <td className="px-2 py-1.5">{it.budget_name ? `📎 ${it.budget_name}` : "-"}</td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      disabled={saving || disabled}
                      onClick={() => removeIncident(it)}
                      className="text-red-600 hover:underline"
                    >
                      remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap justify-end gap-4 border-t border-ekotruck-darkGreen/10 bg-ekotruck-darkGreen/5 px-3 py-2 text-sm font-semibold">
            <span>Adicionado: {currency(addedTotal)}</span>
            <span>Removido: {currency(removedTotal)}</span>
            <span className={net > 0 ? "text-red-600" : net < 0 ? "text-emerald-700" : ""}>
              Impacto líquido: {currency(net)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-md border border-dashed border-ekotruck-orange/40 p-3">
        <p className="text-xs font-medium uppercase text-ekotruck-gray">
          Anexar orçamento complementar (demanda não prevista)
        </p>
        <p className="text-xs text-ekotruck-gray">
          Quando surgir uma demanda não prevista durante a execução com um orçamento próprio (ex.: outro problema
          encontrado no veículo), anexe o PDF aqui — os itens entram automaticamente como imprevistos "adicionado".
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium">Nome do orçamento complementar</label>
          <input
            type="text"
            value={budgetName}
            onChange={(e) => setBudgetName(e.target.value)}
            disabled={savingBudget || disabled}
            placeholder="Nome do orçamento"
            className="w-64 rounded border px-2 py-1.5 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setUploadedPath(null);
              setDraftItems(null);
            }}
            className="block text-sm"
          />
          <button
            type="button"
            disabled={!file || parsing || disabled}
            onClick={analyzeComplementaryBudget}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
          >
            {parsing ? "Analisando..." : "Analisar PDF"}
          </button>
        </div>

        {draftItems && draftItems.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-ekotruck-darkGreen/10">
            <table className="w-full text-xs">
              <thead className="bg-ekotruck-darkGreen/5 text-left uppercase text-ekotruck-gray">
                <tr>
                  <th className="px-2 py-1.5">Categoria</th>
                  <th className="px-2 py-1.5">Partnumber</th>
                  <th className="px-2 py-1.5">Descrição</th>
                  <th className="px-2 py-1.5">Qtde.</th>
                  <th className="px-2 py-1.5">Preço Unit.</th>
                  <th className="px-2 py-1.5">Custo</th>
                  <th className="px-2 py-1.5">Marca / Fornecedor</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {draftItems.map((it, idx) => (
                  <tr key={idx} className="border-t border-ekotruck-darkGreen/10">
                    <td className="px-2 py-1.5 align-top">
                      <select
                        value={it.category}
                        disabled={savingBudget || disabled}
                        onChange={(e) => updateDraftItem(idx, { category: e.target.value as IncidentCategory })}
                        className="rounded border px-1 py-0.5"
                      >
                        <option value="peca">Peça</option>
                        <option value="servico">Serviço</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <input
                        type="text"
                        value={it.partNumber}
                        onChange={(e) => updateDraftItem(idx, { partNumber: e.target.value })}
                        className="w-24 rounded border px-1 py-0.5"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => updateDraftItem(idx, { description: e.target.value })}
                        className="w-40 rounded border px-1 py-0.5"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <input
                        type="number"
                        step="0.01"
                        value={it.quantity}
                        onChange={(e) => updateDraftItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-16 rounded border px-1 py-0.5"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={currency(it.unitPrice)}
                        onChange={(e) => updateDraftItem(idx, { unitPrice: parseCurrencyInput(e.target.value) })}
                        className="w-24 rounded border px-1 py-0.5"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top">{currency(it.totalPrice)}</td>
                    <td className="px-2 py-1.5 align-top">
                      {it.category === "peca" ? (
                        <div className="space-y-1">
                          <select
                            value={it.brand}
                            disabled={savingBudget || disabled}
                            onChange={(e) => {
                              const b = e.target.value as PartBrand;
                              updateDraftItem(idx, {
                                brand: b,
                                supplier: b === "ekotruck" ? "Ekotruck" : b === "scania" ? "" : it.supplier,
                              });
                            }}
                            className="w-32 rounded border px-1 py-0.5"
                          >
                            <option value="scania">Scania Original</option>
                            <option value="ekotruck">Ekotruck</option>
                            <option value="ekotruck_spot">Ekotruck Spot</option>
                          </select>
                          {it.brand === "ekotruck_spot" && (
                            <input
                              type="text"
                              placeholder="origem / fornecedor"
                              value={it.supplier}
                              onChange={(e) => updateDraftItem(idx, { supplier: e.target.value })}
                              className="w-32 rounded border px-1 py-0.5"
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="oficina / fornecedor"
                          value={it.supplier}
                          onChange={(e) => updateDraftItem(idx, { supplier: e.target.value })}
                          className="w-32 rounded border px-1 py-0.5"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <button
                        type="button"
                        onClick={() => removeDraftItem(idx)}
                        className="text-red-600 hover:underline"
                      >
                        remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end border-t border-ekotruck-darkGreen/10 bg-ekotruck-darkGreen/5 px-3 py-2 text-sm font-semibold">
              Total: {currency(draftTotal)}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={savingBudget || disabled}
            onClick={saveComplementaryBudget}
            className="rounded-md border border-ekotruck-orange px-4 py-2 text-sm font-medium text-ekotruck-orange hover:bg-ekotruck-orange/10 disabled:opacity-50"
          >
            {savingBudget ? "Salvando..." : "Salvar orçamento complementar"}
          </button>
          {draftItems && draftItems.length > 0 && !savingBudget && (
            <button type="button" onClick={resetDraftBudget} className="text-sm text-ekotruck-gray hover:underline">
              descartar rascunho
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Tipo</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as IncidentKind)}
            disabled={saving || disabled}
            className="rounded border px-2 py-1.5 text-sm"
          >
            <option value="adicionado">Adicionado (custo extra)</option>
            <option value="removido">Removido (custo a menos)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Categoria</label>
          <select
            value={category}
            onChange={(e) => {
              const cat = e.target.value as IncidentCategory;
              setCategory(cat);
              if (cat === "servico") {
                setPartNumber("");
                setBrand("scania");
              }
            }}
            disabled={saving || disabled}
            className="rounded border px-2 py-1.5 text-sm"
          >
            <option value="peca">Peça</option>
            <option value="servico">Serviço</option>
          </select>
        </div>
        {category === "peca" && (
          <div>
            <label className="mb-1 block text-xs font-medium">Partnumber</label>
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              disabled={saving || disabled}
              className="w-28 rounded border px-2 py-1.5 text-sm"
            />
          </div>
        )}
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving || disabled}
            className="w-full min-w-[160px] rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Qtde.</label>
          <input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            disabled={saving || disabled}
            className="w-20 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Preço Unit.</label>
          <input
            type="text"
            inputMode="numeric"
            value={currency(unitPrice)}
            onChange={(e) => setUnitPrice(parseCurrencyInput(e.target.value))}
            disabled={saving || disabled}
            className="w-28 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        {category === "peca" ? (
          <div>
            <label className="mb-1 block text-xs font-medium">Marca</label>
            <select
              value={brand}
              onChange={(e) => {
                const b = e.target.value as PartBrand;
                setBrand(b);
                if (b === "ekotruck") setSupplier("Ekotruck");
                else if (b === "scania") setSupplier("");
                else if (brand === "ekotruck") setSupplier("");
              }}
              disabled={saving || disabled}
              className="w-36 rounded border px-2 py-1.5 text-sm"
            >
              <option value="scania">Scania Original</option>
              <option value="ekotruck">Ekotruck</option>
              <option value="ekotruck_spot">Ekotruck Spot</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-medium">Oficina / fornecedor</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              disabled={saving || disabled}
              className="w-36 rounded border px-2 py-1.5 text-sm"
            />
          </div>
        )}
        {category === "peca" && brand === "ekotruck_spot" && (
          <div>
            <label className="mb-1 block text-xs font-medium">Origem / fornecedor</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              disabled={saving || disabled}
              className="w-36 rounded border px-2 py-1.5 text-sm"
            />
          </div>
        )}
        <button
          type="button"
          disabled={saving || disabled}
          onClick={addIncident}
          className="rounded-md border border-dashed px-3 py-1.5 text-sm hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
        >
          + Registrar imprevisto
        </button>
      </div>

      <button
        type="button"
        disabled={saving || disabled}
        onClick={() => onCompleted()}
        className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        Concluir execução e finalizar
      </button>
    </div>
  );
}
