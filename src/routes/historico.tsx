import { createFileRoute } from "@tanstack/react-router";
import { HistoricoScreen } from "@/components/HistoricoScreen";

export const Route = createFileRoute("/historico")({
  component: HistoricoScreen,
  head: () => ({
    meta: [{ title: "Histórico — Feira" }],
  }),
});
