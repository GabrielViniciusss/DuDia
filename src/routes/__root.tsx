import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { TabBar } from "@/components/TabBar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-base font-bold text-primary-foreground"
          >
            Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#1d4fd8" },
      { title: "Feira — Vendas por voz" },
      {
        name: "description",
        content: "App para feirantes registrarem vendas e estoque por voz, sem parar o atendimento.",
      },
      { property: "og:title", content: "Feira — Vendas por voz" },
      { name: "twitter:title", content: "Feira — Vendas por voz" },
      { name: "description", content: "Feira Flow: mobile app for vendors to log sales and track inventory via voice or simple input." },
      { property: "og:description", content: "Feira Flow: mobile app for vendors to log sales and track inventory via voice or simple input." },
      { name: "twitter:description", content: "Feira Flow: mobile app for vendors to log sales and track inventory via voice or simple input." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0ea39917-f0c3-416d-a609-d22daf302158/id-preview-a7a24e25--e8c3f426-c7f3-49ca-accf-f1f7b9ed3051.lovable.app-1777589686756.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0ea39917-f0c3-416d-a609-d22daf302158/id-preview-a7a24e25--e8c3f426-c7f3-49ca-accf-f1f7b9ed3051.lovable.app-1777589686756.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <div className="mx-auto max-w-md">
      <Outlet />
      <TabBar />
    </div>
  );
}
