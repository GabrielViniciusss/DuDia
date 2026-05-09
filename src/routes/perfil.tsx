import { createFileRoute } from "@tanstack/react-router";
import { PerfilScreen } from "@/components/PerfilScreen";

export const Route = createFileRoute("/perfil")({
  component: PerfilScreen,
  head: () => ({
    meta: [{ title: "Perfil — Feira" }],
  }),
});
