export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string; // "kg" | "un"
  stock: number;
  photo?: string; // optional data URL
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number; // unit price at time of sale
}

export type PaymentMethod = "pix" | "credito" | "debito" | "dinheiro";

export interface Sale {
  id: string;
  timestamp: number; // ms
  value: number; // R$ (positive = sale, negative = adjustment)
  productId?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  items?: SaleItem[]; // multi-item sale (single Sale = 1 transaction)
  paymentMethod?: PaymentMethod;
  label: string; // human-readable: "+ R$3 tomate"
}
