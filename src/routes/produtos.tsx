import { createFileRoute } from "@tanstack/react-router";
import { ProdutosScreen } from "@/components/ProdutosScreen";

export const Route = createFileRoute("/produtos")({
  component: ProdutosScreen,
  head: () => ({
    meta: [{ title: "Produtos — Feira" }],
  }),
});
