import { useEffect, useMemo, useState } from "react";
import {
  Mic,
  X,
  AlertTriangle,
  Calculator,
  Plus,
  Minus,
  CreditCard,
  ShoppingBasket,
  Check,
  QrCode,
  Banknote,
} from "lucide-react";
import { useStore, useHydrate, store, getTodayStats } from "@/lib/store";
import { useSpeech } from "@/lib/useSpeech";
import { applyAction, interpretCommand, type VoiceAction } from "@/lib/commands";
import { feedback } from "@/lib/feedback";
import { pickTutorial, runTutorial, stopTutorial } from "@/lib/tutorial";
import { useSettings, useHydrateSettings, type Settings } from "@/lib/settings";
import { ProductAvatar } from "./ProductAvatar";
import type { PaymentMethod, Product, SaleItem } from "@/lib/types";

type InputMode = "voz" | "manual";
const INPUT_MODE_KEY = "feira:inputMode";
type Order = Record<string, number>;

export function VendasScreen() {
  useHydrate();
  useHydrateSettings();
  const { products, sales } = useStore();
  const settings = useSettings();
  const { total, count } = getTodayStats(sales);

  const [inputMode, setInputMode] = useState<InputMode>("voz");
  const [processing, setProcessing] = useState(false);
  const [tutorial, setTutorial] = useState<{ idx: number; total: number; text: string } | null>(
    null,
  );
  const [confirmed, setConfirmed] = useState(false);

  const [order, setOrder] = useState<Order>({});

  useEffect(() => {
    if (!confirmed) return;
    const id = window.setTimeout(() => setConfirmed(false), 500);
    return () => window.clearTimeout(id);
  }, [confirmed]);

  // Hydrate input mode from localStorage on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(INPUT_MODE_KEY) as InputMode | null;
    if (saved === "voz" || saved === "manual") setInputMode(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(INPUT_MODE_KEY, inputMode);
  }, [inputMode]);

  // Keep manual order valid
  useEffect(() => {
    setOrder((current) => {
      const productIds = new Set(products.map((p) => p.id));
      const next = Object.fromEntries(
        Object.entries(current).filter(([id, quantity]) => productIds.has(id) && quantity > 0),
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [products]);

  const { supported, listening, start, stop } = useSpeech({
    onResult: async (transcript) => {
      const tut = pickTutorial(transcript);
      if (tut) {
        feedback("ok");
        runTutorial(tut, (idx, total, text) => {
          if (idx >= total) {
            setTutorial(null);
          } else {
            setTutorial({ idx, total, text });
          }
        });
        return;
      }
      setProcessing(true);
      try {
        const action = await interpretCommand(transcript, products);
        handleVoiceOrder(action);
      } catch {
        feedback("err");
      } finally {
        setProcessing(false);
      }
    },
    onError: () => {},
  });

  useEffect(() => () => stop(), [stop]);

  function switchMode(mode: InputMode) {
    if (mode === inputMode) return;
    if (mode === "manual" && listening) stop();
    setInputMode(mode);
  }

  function startVoice() {
    if (!supported || listening || processing) return;
    start();
  }

  function stopVoice() {
    if (!listening) return;
    stop();
  }

  function cancelOrder() {
    setOrder({});
    feedback("ok");
  }

  function addToOrder(product: Product) {
    addQuantityToOrder(product, 1);
  }

  function addQuantityToOrder(product: Product, amount: number) {
    const quantityToAdd = Math.max(1, Math.round(amount));
    if (product.stock <= 0) {
      feedback("err");
      return;
    }
    let added = false;
    setOrder((current) => {
      const quantity = current[product.id] ?? 0;
      if (quantity + quantityToAdd > product.stock) {
        return current;
      }
      added = true;
      return { ...current, [product.id]: quantity + quantityToAdd };
    });
    feedback(added ? "ok" : "err");
  }

  function handleVoiceOrder(action: VoiceAction): void {
    if (action.action !== "sale_with_product") {
      const result = applyAction(action);
      feedback(result.kind);
      return;
    }

    const product = action.product_id
      ? products.find((p) => p.id === action.product_id)
      : action.product_name
        ? store.findProductByName(action.product_name)
        : undefined;
    if (!product) {
      feedback("err");
      return;
    }

    const quantity =
      action.quantity ?? (action.value ? Math.max(1, Math.round(action.value / product.price)) : 1);
    const currentQuantity = order[product.id] ?? 0;
    if (product.stock <= 0 || currentQuantity + quantity > product.stock) {
      feedback("err");
      return;
    }
    addQuantityToOrder(product, quantity);
  }

  function removeFromOrder(productId: string) {
    setOrder((current) => {
      const quantity = current[productId] ?? 0;
      if (quantity <= 1) {
        const { [productId]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [productId]: quantity - 1 };
    });
    feedback("ok");
  }

  function registerManualSale(paymentMethod: PaymentMethod) {
    const items = products
      .map((product) => ({ product, quantity: order[product.id] ?? 0 }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) return;

    const unavailable = items.find((item) => item.quantity > item.product.stock);
    if (unavailable) {
      feedback("err");
      return;
    }

    const totalValue = +items
      .reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      .toFixed(2);
    const saleItems: SaleItem[] = items.map(({ product, quantity }) => ({
      productId: product.id,
      productName: product.name,
      quantity,
      unit: product.unit,
      price: product.price,
    }));
    const totalQty = saleItems.reduce((sum, item) => sum + item.quantity, 0);
    const label =
      saleItems.length === 1
        ? `+ ${fmtPrice(totalValue)} ${saleItems[0].productName}`
        : `+ ${fmtPrice(totalValue)} (${totalQty} ${totalQty === 1 ? "item" : "itens"})`;

    store.addSale({
      value: totalValue,
      items: saleItems,
      paymentMethod,
      label,
    });

    setOrder({});
    setConfirmed(true);
    feedback("ok");
  }

  const totalStr = `R$ ${total.toFixed(2).replace(".", ",")}`;
  const fmtPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= settings.lowStockThreshold);
  const isVoz = inputMode === "voz";
  const orderTotal = products.reduce(
    (sum, product) => sum + product.price * (order[product.id] ?? 0),
    0,
  );

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background">
      {confirmed && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-success text-success-foreground shadow-mic animate-confirm-pop">
            <Check className="h-20 w-20" strokeWidth={3.5} />
          </div>
        </div>
      )}

      <header className="bg-primary px-6 pb-6 pt-5 text-primary-foreground">
        <div className="mb-2 text-xs font-black uppercase tracking-widest opacity-70">DuDia</div>
        <h1 className="text-3xl font-black">Vendas</h1>
        <p className="mt-1 text-sm opacity-80">
          {totalStr} hoje · {count} {count === 1 ? "venda" : "vendas"}
        </p>
      </header>

      {lowStock.length > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border-2 border-warning bg-warning/15 px-3 py-2 text-warning-foreground">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <p className="text-sm font-semibold">
            Estoque acabando: {lowStock.map((p) => p.name).join(", ")}
          </p>
        </div>
      )}

      {/* Mode switcher */}
      <div className="px-4 pt-3">
        <div
          role="tablist"
          aria-label="Modo de entrada"
          className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1 shadow-soft"
        >
          <button
            role="tab"
            aria-selected={!isVoz}
            onClick={() => switchMode("manual")}
            className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition active:scale-95 ${
              !isVoz ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
            }`}
          >
            <Calculator className="h-4 w-4" />
            Manual
          </button>
          <button
            role="tab"
            aria-selected={isVoz}
            onClick={() => switchMode("voz")}
            className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition active:scale-95 ${
              isVoz ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
            }`}
          >
            <Mic className="h-4 w-4" />
            Voz
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {tutorial && (
          <div className="w-full shrink-0 px-4 pt-4">
            <div className="mx-auto w-full max-w-sm rounded-3xl bg-primary-soft p-5 text-primary shadow-soft animate-pop-in">
              <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide">
                <span>
                  Tutorial · {tutorial.idx + 1}/{tutorial.total}
                </span>
                <button
                  onClick={() => {
                    stopTutorial();
                    setTutorial(null);
                  }}
                  className="rounded-full p-1 active:scale-95"
                  aria-label="Parar tutorial"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-lg font-semibold leading-snug">{tutorial.text}</p>
            </div>
          </div>
        )}

        <OrderPad
          products={products}
          settings={settings}
          order={order}
          total={orderTotal}
          fmtPrice={fmtPrice}
          mode={isVoz ? "voz" : "manual"}
          supported={supported}
          listening={listening}
          processing={processing}
          onCancel={cancelOrder}
          onAdd={addToOrder}
          onRemove={removeFromOrder}
          onRegister={registerManualSale}
          onMicDown={startVoice}
          onMicUp={stopVoice}
        />
      </div>
    </div>
  );
}

function OrderPad({
  products,
  settings,
  order,
  total,
  fmtPrice,
  mode,
  supported = true,
  listening = false,
  processing = false,
  onCancel,
  onAdd,
  onRemove,
  onRegister,
  onMicDown,
  onMicUp,
}: {
  products: Product[];
  settings: Settings;
  order: Order;
  total: number;
  fmtPrice: (value: number) => string;
  mode: InputMode;
  supported?: boolean;
  listening?: boolean;
  processing?: boolean;
  onCancel: () => void;
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
  onRegister: (paymentMethod: PaymentMethod) => void;
  onMicDown: () => void;
  onMicUp: () => void;
}) {
  const hasItems = total > 0;
  const isVoice = mode === "voz";
  const [showCheckout, setShowCheckout] = useState(false);

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
      ),
    [products],
  );

  useEffect(() => {
    if (!hasItems && showCheckout) setShowCheckout(false);
  }, [hasItems, showCheckout]);

  if (products.length === 0) {
    return (
      <p className="mx-4 mt-4 rounded-2xl bg-card p-6 text-center text-sm font-semibold text-muted-foreground shadow-soft">
        Cadastre produtos na aba Produtos para registrar vendas.
      </p>
    );
  }

  function openCheckout() {
    if (!hasItems) return;
    setShowCheckout(true);
  }

  function confirmCheckout(paymentMethod: PaymentMethod) {
    setShowCheckout(false);
    onRegister(paymentMethod);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center justify-between px-4 pt-4">
        <h3 className="text-base font-black uppercase tracking-wide text-muted-foreground">
          Pedido
        </h3>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground transition duration-200 hover:bg-danger hover:text-danger-foreground active:scale-95"
          aria-label="Limpar pedido"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <ul className="h-full space-y-2 overflow-y-auto px-4 py-4 pb-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sortedProducts.map((p) => {
            const low = p.stock > 0 && p.stock <= settings.lowStockThreshold;
            const empty = p.stock <= 0;
            const quantity = order[p.id] ?? 0;
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-2xl p-3 shadow-soft ${
                  empty ? "bg-danger/10" : low ? "bg-warning/15" : "bg-card"
                }`}
              >
                <div className="relative">
                  <ProductAvatar name={p.name} photo={p.photo} size={56} />
                  {(low || empty) && (
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-warning text-xs font-black text-warning-foreground shadow">
                      ⚠
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-lg font-bold text-foreground">
                    <span className="truncate">{p.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {fmtPrice(p.price)}/{p.unit} ·{" "}
                    <span
                      className={
                        empty
                          ? "font-bold text-danger"
                          : low
                            ? "font-bold text-warning-foreground"
                            : ""
                      }
                    >
                      {p.stock}
                      {p.unit} {empty ? "sem estoque" : low ? "acabando" : "no estoque"}
                    </span>
                  </div>
                </div>
                {!isVoice && quantity > 0 && (
                  <button
                    onClick={() => onRemove(p.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger/10 text-danger active:scale-95"
                    aria-label={`Remover ${p.name} do pedido`}
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                )}
                {quantity > 0 && (
                  <span className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-primary-soft px-3 text-base font-black text-primary">
                    {quantity}
                  </span>
                )}
                {!isVoice && (
                  <button
                    onClick={() => onAdd(p)}
                    disabled={empty || quantity >= p.stock}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success active:scale-95 disabled:opacity-40"
                    aria-label={`Adicionar ${p.name} ao pedido`}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent via-background to-background" />
      </div>

      <div className="absolute inset-x-0 bottom-24 z-30 px-4">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            onClick={openCheckout}
            disabled={!hasItems}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-success px-5 py-4 text-success-foreground shadow-mic transition-[transform,colors] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:opacity-100 disabled:hover:translate-y-0 ${
              isVoice ? "flex-1" : "w-full"
            }`}
            aria-label="Finalizar venda"
          >
            <span className="text-xs font-black uppercase tracking-wide">Vender</span>
            <span className="text-3xl font-black tabular-nums">{fmtPrice(total)}</span>
          </button>

          {isVoice && supported && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                onMicDown();
              }}
              onPointerUp={() => onMicUp()}
              onPointerCancel={() => onMicUp()}
              onPointerLeave={(e) => {
                if ((e.currentTarget as HTMLButtonElement).hasPointerCapture(e.pointerId)) {
                  onMicUp();
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={processing}
              aria-pressed={listening}
              aria-label={listening ? "Solte para enviar" : "Segure para falar"}
              className={`flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-full shadow-soft transition active:scale-95 disabled:opacity-60 ${
                listening
                  ? "scale-110 bg-danger text-danger-foreground animate-pulse-mic"
                  : "bg-card text-primary ring-1 ring-border"
              }`}
              style={{ touchAction: "none", WebkitUserSelect: "none" }}
            >
              <Mic className="h-6 w-6" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {showCheckout && (
        <CheckoutSheet
          total={total}
          fmtPrice={fmtPrice}
          onClose={() => setShowCheckout(false)}
          onConfirm={confirmCheckout}
        />
      )}
    </div>
  );
}

function CheckoutSheet({
  total,
  fmtPrice,
  onClose,
  onConfirm,
}: {
  total: number;
  fmtPrice: (value: number) => string;
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethod) => void;
}) {
  const [step, setStep] = useState<"summary" | "payment" | "cash">("summary");
  const [cashInput, setCashInput] = useState("");

  const cashReceived = parseFloat(cashInput.replace(",", ".")) || 0;
  const change = cashReceived - total;
  const canConfirmCash = cashReceived >= total && cashReceived > 0;

  function openCashStep() {
    setCashInput("");
    setStep("cash");
  }

  function confirmCash() {
    if (!canConfirmCash) return;
    onConfirm("dinheiro");
  }

  const headerLabel =
    step === "summary"
      ? "Total do pedido"
      : step === "payment"
        ? "Forma de pagamento"
        : "Pagamento em dinheiro";

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col justify-end">
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="flex-1 cursor-default"
        />
        <div className="mx-3 mb-28 rounded-3xl bg-card p-5 shadow-mic animate-pop-in">
          <div className="mb-5 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {headerLabel}
            </p>
            <p className="mt-1 text-4xl font-black tabular-nums text-foreground">
              {fmtPrice(total)}
            </p>
          </div>

          {step === "summary" ? (
            <div className="space-y-2">
              <button
                onClick={() => setStep("payment")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success px-6 py-4 text-base font-black uppercase tracking-wide text-success-foreground shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-mic active:translate-y-0 active:scale-[0.98]"
              >
                <CreditCard className="h-5 w-5" />
                Ir para o pagamento
              </button>
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-muted px-6 py-4 text-base font-bold text-foreground transition duration-200 hover:-translate-y-0.5 hover:bg-muted/80 active:translate-y-0 active:scale-[0.98]"
              >
                <ShoppingBasket className="h-5 w-5" />
                Adicionar mais itens
              </button>
            </div>
          ) : step === "cash" ? (
            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Valor recebido
                </span>
                <div className="mt-1 flex items-center gap-2 rounded-2xl bg-card px-4 py-3 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
                  <span className="text-lg font-black text-muted-foreground">R$</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    placeholder="0,00"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value.replace(/[^0-9.,]/g, ""))}
                    className="w-full bg-transparent text-2xl font-black tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </label>

              <div
                className={`rounded-2xl px-5 py-4 text-center transition ${
                  canConfirmCash
                    ? "bg-success/10 text-success"
                    : cashInput
                      ? "bg-danger/10 text-danger"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide opacity-80">
                  {canConfirmCash
                    ? "Troco"
                    : cashInput
                      ? "Valor insuficiente"
                      : "Aguardando valor recebido"}
                </p>
                <p className="mt-1 text-3xl font-black tabular-nums">
                  {canConfirmCash
                    ? fmtPrice(change)
                    : cashInput
                      ? fmtPrice(total - cashReceived)
                      : fmtPrice(0)}
                </p>
              </div>

              <button
                onClick={confirmCash}
                disabled={!canConfirmCash}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success px-6 py-4 text-base font-black uppercase tracking-wide text-success-foreground shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-mic active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                <Check className="h-5 w-5" />
                Confirmar pagamento
              </button>
              <button
                onClick={() => setStep("payment")}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-danger/10 px-6 py-3 text-sm font-bold text-danger transition duration-200 hover:-translate-y-0.5 hover:bg-danger hover:text-danger-foreground active:translate-y-0 active:scale-[0.98]"
              >
                Voltar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => onConfirm("pix")}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-primary-soft px-5 py-4 text-base font-black text-primary shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-mic active:translate-y-0 active:scale-[0.98]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <QrCode className="h-5 w-5" />
                  </span>
                  Pix
                </span>
                <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                  Instantâneo
                </span>
              </button>
              <button
                onClick={() => onConfirm("credito")}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4 text-base font-black text-foreground shadow-soft ring-1 ring-border transition duration-200 hover:-translate-y-0.5 hover:shadow-mic active:translate-y-0 active:scale-[0.98]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success text-success-foreground">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  Crédito
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Cartão
                </span>
              </button>
              <button
                onClick={() => onConfirm("debito")}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4 text-base font-black text-foreground shadow-soft ring-1 ring-border transition duration-200 hover:-translate-y-0.5 hover:shadow-mic active:translate-y-0 active:scale-[0.98]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning text-warning-foreground">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  Débito
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Cartão
                </span>
              </button>
              <button
                onClick={openCashStep}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4 text-base font-black text-foreground shadow-soft ring-1 ring-border transition duration-200 hover:-translate-y-0.5 hover:shadow-mic active:translate-y-0 active:scale-[0.98]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success text-success-foreground">
                    <Banknote className="h-5 w-5" />
                  </span>
                  Dinheiro
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  À vista
                </span>
              </button>
              <button
                onClick={() => setStep("summary")}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-danger/10 px-6 py-3 text-sm font-bold text-danger transition duration-200 hover:-translate-y-0.5 hover:bg-danger hover:text-danger-foreground active:translate-y-0 active:scale-[0.98]"
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
