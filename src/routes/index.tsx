import { createFileRoute } from "@tanstack/react-router";
import { VendasScreen } from "@/components/VendasScreen";

export const Route = createFileRoute("/")({
  component: VendasScreen,
  head: () => ({
    meta: [{ title: "Vendas — Feira" }],
  }),
});
