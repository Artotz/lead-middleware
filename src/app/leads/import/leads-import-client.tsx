"use client";

import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { importLeads, type LeadImportItem } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { useToast } from "@/components/ToastProvider";

type LeadImportRow = {
  id: string;
  regional: string;
  estado: string;
  city: string;
  consultor: string;
  clienteBaseEnriquecida: string;
  chassi: string;
  modelName: string;
  horimetroAtualMachineList: string;
  leadTipos: string[];
};

type ColumnKey = Exclude<keyof LeadImportRow, "id">;
type LeadImportCellValue = LeadImportRow[ColumnKey];

type ColumnDef = {
  key: ColumnKey;
  label: string;
  width: string;
  type: "text" | "number" | "datetime" | "multi";
};

const LEAD_TYPE_OPTIONS = [
  "preventiva",
  "garantia_basica",
  "garantia_estendida",
  "reforma_componentes",
  "lamina",
  "dentes",
  "rodante",
  "disponibilidade",
  "reconexao",
  "transferencia_aor",
];

const COLUMNS: ColumnDef[] = [
  { key: "regional", label: "Regional", width: "90px", type: "text" },
  { key: "estado", label: "Estado", width: "90px", type: "text" },
  { key: "city", label: "Cidade", width: "160px", type: "text" },
  { key: "consultor", label: "Consultor", width: "180px", type: "text" },
  { key: "clienteBaseEnriquecida", label: "Cliente", width: "220px", type: "text" },
  { key: "chassi", label: "Chassi", width: "160px", type: "text" },
  { key: "modelName", label: "Modelo", width: "180px", type: "text" },
  { key: "horimetroAtualMachineList", label: "Horimetro", width: "120px", type: "number" },
  { key: "leadTipos", label: "Tipos do lead", width: "260px", type: "multi" },
];

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createEmptyRow = (): LeadImportRow => ({
  id: makeId(),
  regional: "",
  estado: "",
  city: "",
  consultor: "",
  clienteBaseEnriquecida: "",
  chassi: "",
  modelName: "",
  horimetroAtualMachineList: "",
  leadTipos: [],
});

const isRowEmpty = (row: LeadImportRow) => {
  return COLUMNS.every((col) => {
    const value = row[col.key];
    if (Array.isArray(value)) return value.length === 0;
    return value.trim() === "";
  });
};

const toPayloadItem = (row: LeadImportRow): LeadImportItem => ({
  regional: row.regional.trim() || null,
  estado: row.estado.trim() || null,
  city: row.city.trim() || null,
  consultor: row.consultor.trim() || null,
  clienteBaseEnriquecida: row.clienteBaseEnriquecida.trim() || null,
  chassi: row.chassi.trim() || null,
  modelName: row.modelName.trim() || null,
  horimetroAtualMachineList: row.horimetroAtualMachineList.trim() || null,
  leadTipos: row.leadTipos.length ? row.leadTipos : null,
});

export default function LeadsImportClient() {
  const toast = useToast();
  const [rows, setRows] = useState<LeadImportRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filledRowsCount = useMemo(
    () => rows.filter((row) => !isRowEmpty(row)).length,
    [rows],
  );

  const handleCellChange = useCallback(
    (rowId: string, key: ColumnKey, value: LeadImportCellValue) => {
      setRows((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
      );
    },
    [],
  );

  const addRows = (count: number) => {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: count }, () => createEmptyRow()),
    ]);
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const removeEmptyRows = () => {
    setRows((prev) => prev.filter((row) => !isRowEmpty(row)));
  };

  const handleImport = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = rows
        .filter((row) => !isRowEmpty(row))
        .map(toPayloadItem);

      if (!payload.length) {
        setError("Nenhuma linha preenchida para importar.");
        setLoading(false);
        return;
      }

      const response = await importLeads(payload);
      toast.push({
        variant: "success",
        message: `Importacao concluida. Leads inseridos: ${response.inserted}.`,
      });
      setRows([
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
      ]);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Nao foi possivel importar os leads.";
      setError(message);
      toast.push({ variant: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Insercao de leads"
      subtitle="Preencha as colunas do lead e importe como em uma planilha."
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Planilha de leads
            </h2>
            <p className="text-xs text-slate-500">
              {filledRowsCount} linhas preenchidas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => addRows(1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Adicionar linha
            </button>
            <button
              type="button"
              onClick={() => addRows(5)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Adicionar 5 linhas
            </button>
            <button
              type="button"
              onClick={removeEmptyRows}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Remover vazias
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Importando..." : "Importar leads"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[2200px] w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className="sticky top-0 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="sticky top-0 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  {COLUMNS.map((col) => {
                    const value = row[col.key];
                    const inputValue = Array.isArray(value) ? "" : value;
                    const commonProps = {
                      value: inputValue,
                      onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                        handleCellChange(row.id, col.key, event.target.value),
                      className:
                        "w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100",
                    };

                    return (
                      <td key={col.key} className="px-3 py-2 align-top">
                        {col.type === "multi" ? (
                          <select
                            multiple
                            value={Array.isArray(value) ? value : []}
                            onChange={(event) => {
                              const selected = Array.from(
                                event.target.selectedOptions,
                              ).map((option) => option.value);
                              handleCellChange(row.id, col.key, selected);
                            }}
                            className="w-full min-h-[88px] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          >
                            {LEAD_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : col.type === "datetime" ? (
                          <input {...commonProps} type="datetime-local" />
                        ) : (
                          <input {...commonProps} type={col.type} />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 align-top">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    className="px-3 py-6 text-center text-sm text-slate-500"
                  >
                    Nenhuma linha adicionada. Clique em "Adicionar linha".
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
