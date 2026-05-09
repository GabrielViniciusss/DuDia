import { supabase } from "@/integrations/supabase/client";
import { store } from "./store";
import type { Product } from "./types";

interface VoiceAction {
  action:
    | "sale_amount"
    | "adjust_amount"
    | "sale_with_product"
    | "register_product"
    | "stock_add"
    | "stock_remove"
    | "unknown";
  value?: number;
  quantity?: number;
  product_id?: string;
  product_name?: string;
  product_price?: number;
  product_unit?: string;
  message?: string;
}

export interface ProcessResult {
  ok: boolean;
  label: string; // for UI feedback bubble
  kind: "ok" | "err" | "warn";
}

export async function interpretCommand(
  transcript: string,
  products: Product[],
): Promise<VoiceAction> {
  const { data, error } = await supabase.functions.invoke("interpret-voice", {
    body: { transcript, products },
  });
  if (error) {
    return { action: "unknown", message: error.message };
  }
  return data as VoiceAction;
}

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export function applyAction(act: VoiceAction): ProcessResult {
  switch (act.action) {
    case "sale_amount": {
      // Pure-amount sales without a product are NOT allowed (per requirement).
      return {
        ok: false,
        label: "Diga o produto também",
        kind: "err",
      };
    }
    case "adjust_amount": {
      const v = -Math.abs(act.value || 0);
      if (!v) return err("Valor inválido");
      store.addSale({ value: v, label: `${fmt(v)}` });
      return ok(`${fmt(v)}`);
    }
    case "sale_with_product": {
      const product = act.product_id
        ? findById(act.product_id)
        : act.product_name
          ? store.findProductByName(act.product_name)
          : undefined;
      if (!product) {
        const pname = act.product_name || "esse produto";
        return err(`${pname} não encontrado`);
      }

      let value = act.value ?? 0;
      let qty = act.quantity ?? 0;
      if (value && !qty) qty = +(value / product.price).toFixed(3);
      else if (qty && !value) value = +(qty * product.price).toFixed(2);
      if (!value || !qty) return err("Comando incompleto");

      // Stock validation: cannot sell more than available
      if (product.stock <= 0) {
        return err(`Sem estoque de ${product.name}`);
      }
      if (qty > product.stock + 0.001) {
        return err("Estoque insuficiente");
      }

      store.addSale({
        value,
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unit: product.unit,
        label: `+ ${fmt(value)} ${product.name}`,
      });
      return {
        ok: true,
        label: `+ ${fmt(value)} ${product.name}`,
        kind: "ok",
      };
    }
    case "register_product": {
      if (!act.product_name || !act.product_price) {
        return err("Faltou nome ou preço");
      }
      const p = store.addProduct({
        name: act.product_name,
        price: act.product_price,
        unit: act.product_unit || "kg",
        stock: 0,
      });
      return ok(`${p.name} cadastrado`);
    }
    case "stock_add": {
      const p = act.product_id
        ? findById(act.product_id)
        : act.product_name
          ? store.findProductByName(act.product_name)
          : undefined;
      if (!p) return err("Produto não encontrado");
      const q = act.quantity ?? 0;
      if (!q) return err("Quantidade inválida");
      store.adjustStock(p.id, q);
      return ok(`+${q}${p.unit} ${p.name}`);
    }
    case "stock_remove": {
      const p = act.product_id
        ? findById(act.product_id)
        : act.product_name
          ? store.findProductByName(act.product_name)
          : undefined;
      if (!p) return err("Produto não encontrado");
      const q = act.quantity ?? 0;
      if (!q) return err("Quantidade inválida");
      store.adjustStock(p.id, -q);
      return {
        ok: true,
        label: `-${q}${p.unit} ${p.name}`,
        kind: "ok",
      };
    }
    default:
      return err(act.message || "Não entendi");
  }
}

function ok(label: string): ProcessResult {
  return { ok: true, label, kind: "ok" };
}
function err(label: string): ProcessResult {
  return { ok: false, label, kind: "err" };
}

function findById(id: string): Product | undefined {
  try {
    const raw = localStorage.getItem("feira:products");
    if (!raw) return undefined;
    const arr = JSON.parse(raw) as Product[];
    return arr.find((p) => p.id === id);
  } catch {
    return undefined;
  }
}

export type { VoiceAction };
