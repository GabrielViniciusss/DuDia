import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Trash2, X, Camera, ImagePlus, Mic } from "lucide-react";
import { useStore, useHydrate, store } from "@/lib/store";
import { useSettings, useHydrateSettings } from "@/lib/settings";
import { useSpeech } from "@/lib/useSpeech";
import { applyAction, interpretCommand } from "@/lib/commands";
import { feedback } from "@/lib/feedback";
import { ProductAvatar } from "./ProductAvatar";

async function fileToResizedDataUrl(file: File, maxSize = 320): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("invalid image"));
    i.src = dataUrl;
  });
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ProdutosScreen() {
  useHydrate();
  useHydrateSettings();
  const { products } = useStore();
  const settings = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
      ),
    [products],
  );

  const { supported, listening, start, stop } = useSpeech({
    onResult: async (transcript) => {
      setProcessing(true);
      try {
        const action = await interpretCommand(transcript, products);
        const result = applyAction(action);
        feedback(result.kind);
      } catch {
        feedback("err");
      } finally {
        setProcessing(false);
      }
    },
    onError: () => {},
  });

  useEffect(() => () => stop(), [stop]);

  function startVoice() {
    if (!supported || listening || processing) return;
    start();
  }

  function stopVoice() {
    if (!listening) return;
    stop();
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background">
      <header className="bg-primary px-6 pb-6 pt-5 text-primary-foreground">
        <div className="mb-2 text-xs font-black uppercase tracking-widest opacity-70">DuDia</div>
        <h1 className="text-3xl font-black">Produtos</h1>
        <p className="mt-1 text-sm opacity-80">{products.length} cadastrados</p>
      </header>

      <div className="relative min-h-0 flex-1">
        <ul className="h-full space-y-2 overflow-y-auto px-4 py-4 pb-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sortedProducts.length === 0 && (
          <li className="rounded-2xl bg-card p-6 text-center text-muted-foreground shadow-soft">
            Nenhum produto. Toque <span className="font-bold text-foreground">Cadastrar</span>.
          </li>
        )}
        {sortedProducts.map((p) => {
          const low = p.stock > 0 && p.stock <= settings.lowStockThreshold;
          const empty = p.stock <= 0;
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-lg font-bold text-foreground">
                  <span className="truncate">{p.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  R$ {p.price.toFixed(2).replace(".", ",")}/{p.unit} ·{" "}
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
              <button
                onClick={() => {
                  store.adjustStock(p.id, -1);
                  feedback("ok");
                }}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger/10 text-danger active:scale-95"
                aria-label="Tirar estoque"
              >
                <Minus className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  store.adjustStock(p.id, 1);
                  feedback("ok");
                }}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success active:scale-95"
                aria-label="Adicionar estoque"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Excluir ${p.name}?`)) {
                    store.removeProduct(p.id);
                  }
                }}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground active:scale-95"
                aria-label="Excluir"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </li>
          );
        })}
        </ul>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent via-background to-background" />
      </div>

      <div className="absolute inset-x-0 bottom-24 z-30 px-4">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-success px-5 py-4 text-base font-black uppercase tracking-wide text-success-foreground shadow-mic transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            <Plus className="h-5 w-5" /> Cadastrar
          </button>

          {supported && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                startVoice();
              }}
              onPointerUp={() => stopVoice()}
              onPointerCancel={() => stopVoice()}
              onPointerLeave={(e) => {
                if ((e.currentTarget as HTMLButtonElement).hasPointerCapture(e.pointerId)) {
                  stopVoice();
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

      {showForm && <ProductForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

function ProductForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<"kg" | "un">("kg");
  const [stock, setStock] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError(null);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 320);
      setPhoto(dataUrl);
    } catch {
      setPhotoError("Não foi possível ler a imagem.");
    }
  }

  function submit() {
    const p = parseFloat(price.replace(",", "."));
    const s = parseFloat(stock.replace(",", ".")) || 0;
    if (!name.trim() || !p) return;
    store.addProduct({ name: name.trim(), price: p, unit, stock: s, photo });
    feedback("ok");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-6 shadow-soft sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Novo produto</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted text-muted-foreground transition active:scale-95"
              aria-label={photo ? "Trocar foto" : "Adicionar foto"}
            >
              {photo ? (
                <img src={photo} alt="Foto do produto" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-7 w-7" />
              )}
            </button>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Foto do produto</p>
              <p className="text-xs text-muted-foreground">Opcional. Aparece na lista e nas vendas.</p>
              {photoError && (
                <p className="mt-1 text-xs font-semibold text-danger">{photoError}</p>
              )}
            </div>
            {photo ? (
              <button
                type="button"
                onClick={() => setPhoto(undefined)}
                className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger transition hover:bg-danger hover:text-danger-foreground active:scale-95"
              >
                Remover
              </button>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-1 rounded-xl bg-primary-soft px-3 py-2 text-xs font-bold text-primary transition active:scale-95"
              >
                <ImagePlus className="h-4 w-4" />
                Adicionar
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (ex: Couve-flor)"
            className="h-14 w-full rounded-2xl border border-border bg-background px-4 text-lg font-semibold outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="Preço"
              className="h-14 flex-1 rounded-2xl border border-border bg-background px-4 text-lg font-semibold outline-none focus:border-primary"
            />
            <div className="flex rounded-2xl bg-muted p-1">
              {(["kg", "un"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`h-12 w-14 rounded-xl text-base font-bold ${
                    unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <input
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            inputMode="decimal"
            placeholder="Estoque inicial (opcional)"
            className="h-14 w-full rounded-2xl border border-border bg-background px-4 text-lg font-semibold outline-none focus:border-primary"
          />
          <button
            onClick={submit}
            className="h-14 w-full rounded-2xl bg-success text-lg font-bold text-success-foreground shadow-soft active:scale-95"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
