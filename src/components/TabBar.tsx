import { Link, useLocation } from "@tanstack/react-router";
import { DollarSign, Package, History, User } from "lucide-react";

export function TabBar() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/", icon: DollarSign, label: "Vendas" },
    { to: "/produtos", icon: Package, label: "Produtos" },
    { to: "/historico", icon: History, label: "Histórico" },
    { to: "/perfil", icon: User, label: "Perfil" },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`} />
              {label}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
