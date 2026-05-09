import { useEffect, useState } from "react";
import { User, Store, Vibrate, Bell, LogOut, GraduationCap, X } from "lucide-react";
import { useSettings, useHydrateSettings, settingsStore } from "@/lib/settings";
import { useStore, useHydrate } from "@/lib/store";
import { feedback } from "@/lib/feedback";
import { supabase } from "@/integrations/supabase/client";

const HELP_CARDS = {
  app: {
    title: "Como usar o DuDia",
    steps: [
      "Cadastre seus produtos com nome, preço, unidade e estoque inicial.",
      "Na aba Vendas, escolha Manual para tocar nos produtos ou Voz para segurar o microfone e falar o pedido.",
      "Confira o Valor Total, escolha a forma de pagamento e finalize a venda.",
      "O total do dia aparece no topo da tela e o estoque é atualizado automaticamente.",
      "Na aba Histórico, toque em um dia e depois em uma venda para ver os itens vendidos.",
    ],
  },
  vender: {
    title: "Como vender",
    steps: [
      "Entre na aba Vendas.",
      "No modo Manual, toque no botão de adicionar ao lado dos produtos.",
      "No modo Voz, segure o botão de microfone, fale os itens do pedido e solte ao terminar.",
      "Toque em Valor Total, vá para o pagamento e escolha Pix, Crédito ou Débito.",
      "A confirmação aparece no centro da tela e a venda entra no total do dia.",
    ],
  },
  cadastrar: {
    title: "Como cadastrar produtos",
    steps: [
      "Entre na aba Produtos.",
      "Toque em Cadastrar.",
      "Preencha o nome do produto, preço, unidade e estoque inicial.",
      "Toque em Salvar para adicionar o produto à lista.",
      "Depois, use os botões de + e - na lista para ajustar o estoque.",
    ],
  },
  estoque: {
    title: "Como controlar estoque",
    steps: [
      "Cada produto mostra a quantidade disponível na lista.",
      "Use o botão + para adicionar uma unidade ao estoque.",
      "Use o botão - para remover uma unidade do estoque.",
      "Ao registrar uma venda, o estoque dos itens vendidos diminui automaticamente.",
      "Quando o estoque estiver baixo, o produto aparece destacado com aviso.",
    ],
  },
} as const;

type HelpKey = keyof typeof HELP_CARDS;

export function PerfilScreen() {
  useHydrate();
  useHydrateSettings();
  const settings = useSettings();
  const { products, sales } = useStore();
  const [confirming, setConfirming] = useState(false);
  const [helpKey, setHelpKey] = useState<HelpKey | null>(null);
  const help = helpKey ? HELP_CARDS[helpKey] : null;

  useEffect(() => {
    if (!help) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [help]);

  function update<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    settingsStore.update({ [key]: value });
  }

  async function logout() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore: still proceed with local cleanup
    }
    feedback("ok");
    setConfirming(false);
    window.location.reload();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-24">
      <header className="bg-primary px-6 pb-6 pt-5 text-primary-foreground">
        <div className="mb-2 text-xs font-black uppercase tracking-widest opacity-70">DuDia</div>
        <h1 className="text-3xl font-black">Perfil</h1>
        <p className="mt-1 text-sm opacity-80">
          {[settings.stallName, settings.ownerName].filter(Boolean).join(" · ") || "Minha banca"}
        </p>
      </header>

      <div className="flex-1 space-y-6 px-4 py-6">
        {/* Identidade */}
        <section className="space-y-3">
          <h2 className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Identificação
          </h2>
          <div className="rounded-2xl bg-card p-2 shadow-soft">
            <label className="flex items-center gap-3 px-3 py-3">
              <User className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Seu nome
                </span>
                <input
                  type="text"
                  value={settings.ownerName}
                  onChange={(e) => update("ownerName", e.target.value)}
                  placeholder="Ex: João"
                  className="w-full bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </label>
            <div className="mx-3 h-px bg-border" />
            <label className="flex items-center gap-3 px-3 py-3">
              <Store className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nome da banca
                </span>
                <input
                  type="text"
                  value={settings.stallName}
                  onChange={(e) => update("stallName", e.target.value)}
                  placeholder="Ex: Hortifruti do João"
                  className="w-full bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </label>
          </div>
        </section>

        {/* Preferências */}
        <section className="space-y-3">
          <h2 className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Preferências
          </h2>
          <div className="rounded-2xl bg-card p-2 shadow-soft">
            <Toggle
              icon={<Vibrate className="h-5 w-5" />}
              label="Vibração"
              hint="Confirmação tátil"
              checked={settings.vibration}
              onChange={(v) => update("vibration", v)}
            />
            <div className="mx-3 h-px bg-border" />
            <Toggle
              icon={<Bell className="h-5 w-5" />}
              label="Notificações"
              hint="Alertas de estoque baixo e vendas"
              checked={settings.notifications}
              onChange={(v) => update("notifications", v)}
            />
          </div>
        </section>

        {/* Tutoriais */}
        <section className="space-y-3">
          <h2 className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Aprender a usar
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "app", label: "Visão geral" },
              { key: "vender", label: "Vender" },
              { key: "cadastrar", label: "Cadastrar" },
              { key: "estoque", label: "Estoque" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setHelpKey(t.key as HelpKey)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-card px-3 py-4 text-sm font-bold text-foreground shadow-soft active:scale-95"
              >
                <GraduationCap className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Resumo */}
        <section className="space-y-3">
          <h2 className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Resumo
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-card p-4 text-center shadow-soft">
              <p className="text-3xl font-black text-foreground tabular-nums">{products.length}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Produtos
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-card p-4 text-center shadow-soft">
              <p className="text-3xl font-black text-foreground tabular-nums">{sales.length}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vendas
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <button
            onClick={logout}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-bold shadow-soft transition active:scale-[0.98] ${
              confirming ? "bg-danger text-danger-foreground" : "bg-card text-danger"
            }`}
          >
            <LogOut className="h-5 w-5" />
            {confirming ? "Toque novamente para sair" : "Sair"}
          </button>
        </section>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Dados salvos apenas neste aparelho.
        </p>
      </div>

      {help && (
        <div className="fixed inset-x-0 bottom-24 top-0 z-40 flex justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-md flex-col bg-background animate-pop-in">
            <header className="bg-primary px-6 pb-6 pt-10 text-primary-foreground shadow-soft">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest opacity-70">
                    Aprender a usar
                  </p>
                  <h2 className="mt-1 text-3xl font-black leading-tight">{help.title}</h2>
                </div>
                <button
                  onClick={() => setHelpKey(null)}
                  className="rounded-full bg-white/15 p-2 active:scale-95"
                  aria-label="Fechar explicação"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="rounded-3xl bg-card p-5 shadow-soft">
                <ol className="space-y-4">
                  {help.steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary-soft text-sm font-black text-primary">
                        {index + 1}
                      </span>
                      <p className="pt-1 text-base font-semibold leading-snug text-foreground">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 px-3 py-3 text-left"
    >
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex-1">
        <span className="block text-base font-semibold text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </div>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-success" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
