import { Outlet, createRootRoute, Link } from "@tanstack/react-router";
import { TabBar } from "@/components/TabBar";
import "../styles.css";

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
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <div className="mx-auto max-w-md">
      <Outlet />
      <TabBar />
    </div>
  );
}