import { useState } from "react";
import { ChevronRight, ChevronDown, ArrowLeft } from "lucide-react";
import { useStore, useHydrate, groupByDay } from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
};

function fmtBRL(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function parseDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function HistoricoScreen() {
  useHydrate();
  const { sales } = useStore();
  const days = groupByDay(sales);
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const day = selected ? days.find((d) => d.date === selected) : null;

  function toggleSale(id: string) {
    setExpandedSaleId((current) => (current === id ? null : id));
  }

  function backToDays() {
    setSelected(null);
    setExpandedSaleId(null);
  }

  if (day) {
    const dt = parseDate(day.date);
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background pb-24">
        <header className="bg-primary px-6 pb-6 pt-5 text-primary-foreground">
          <div className="mb-2 text-xs font-black uppercase tracking-widest opacity-70">DuDia</div>
          <button
            onClick={backToDays}
            className="-ml-2 mb-3 flex items-center gap-1 text-sm opacity-80 active:opacity-100"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <h1 className="text-3xl font-black leading-tight">
            {DOW[dt.getDay()]}, {dt.getDate()} de {MONTHS[dt.getMonth()]}
          </h1>
          <p className="mt-1 text-sm opacity-80">
            {fmtBRL(day.total)} · {day.count} {day.count === 1 ? "venda" : "vendas"}
          </p>
        </header>
        <ul className="space-y-2 px-4 py-4">
          {day.sales.map((s) => {
            const isExpanded = expandedSaleId === s.id;
            const hasDetails =
              (s.items && s.items.length > 0) || s.paymentMethod || s.quantity != null;
            return (
              <li key={s.id} className="overflow-hidden rounded-2xl bg-card shadow-soft">
                <button
                  type="button"
                  onClick={() => hasDetails && toggleSale(s.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition active:scale-[0.99] disabled:opacity-100"
                  aria-expanded={isExpanded}
                  disabled={!hasDetails}
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-lg font-bold ${
                        s.value >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {s.label}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {fmtTime(s.timestamp)}
                      {s.paymentMethod && (
                        <>
                          {" · "}
                          <span className="font-semibold uppercase tracking-wide">
                            {PAYMENT_LABELS[s.paymentMethod]}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {hasDetails && (
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {isExpanded && hasDetails && (
                  <div className="border-t border-border px-4 py-3">
                    {s.items && s.items.length > 0 ? (
                      <ul className="space-y-1.5">
                        {s.items.map((item) => (
                          <li
                            key={item.productId}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2 text-foreground">
                              <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-primary-soft px-1.5 text-xs font-black text-primary">
                                {item.quantity}
                              </span>
                              <span className="truncate font-semibold">{item.productName}</span>
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {fmtBRL(item.price * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : s.quantity ? (
                      <div className="text-sm text-muted-foreground">
                        {s.quantity}
                        {s.unit} · {s.productName}
                      </div>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-24">
      <header className="bg-primary px-6 pb-6 pt-5 text-primary-foreground">
        <div className="mb-2 text-xs font-black uppercase tracking-widest opacity-70">DuDia</div>
        <h1 className="text-3xl font-black">Histórico</h1>
        <p className="mt-1 text-sm opacity-80">
          {days.length} {days.length === 1 ? "dia" : "dias"} de vendas
        </p>
      </header>

      <ul className="space-y-2 px-4 py-4">
        {days.length === 0 && (
          <li className="rounded-2xl bg-card p-6 text-center text-muted-foreground shadow-soft">
            Sem vendas ainda.
          </li>
        )}
        {days.map((d) => {
          const dt = parseDate(d.date);
          const today = new Date();
          const isToday =
            dt.getDate() === today.getDate() &&
            dt.getMonth() === today.getMonth() &&
            dt.getFullYear() === today.getFullYear();
          return (
            <li key={d.date}>
              <button
                onClick={() => setSelected(d.date)}
                className="flex w-full items-center justify-between rounded-2xl bg-card p-5 text-left shadow-soft active:scale-[0.98]"
              >
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">
                    {isToday
                      ? "Hoje"
                      : `${DOW[dt.getDay()]}, ${dt.getDate()} ${MONTHS[dt.getMonth()]}`}
                  </div>
                  <div className="mt-1 text-2xl font-black tabular-nums text-foreground">
                    {fmtBRL(d.total)}
                  </div>
                  <div className="text-xs text-muted-foreground">{d.count} vendas</div>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
