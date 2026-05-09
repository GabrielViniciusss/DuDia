// Interprets natural-language Portuguese commands from feirantes into structured operations.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Product {
  id: string;
  name: string;
  price: number; // price per unit
  unit: string; // kg, un, etc.
  stock: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, products } = await req.json() as {
      transcript: string;
      products: Product[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const productList = products.length
      ? products.map(p => `- ${p.name} (id: ${p.id}, R$${p.price}/${p.unit}, estoque: ${p.stock}${p.unit})`).join("\n")
      : "Nenhum produto cadastrado ainda.";

    const systemPrompt = `Você interpreta comandos de voz em português de feirantes brasileiros e retorna UMA ação estruturada.

PRODUTOS CADASTRADOS:
${productList}

REGRAS:
- "10 reais" / "vendi 10" => sale_amount sem produto
- "tirar 5" / "menos 5" => adjust_amount negativo
- "3 reais de tomate" => sale_with_product (calcular qty = 3 / preço)
- "meio quilo de tomate" / "2 quilos de banana" => sale_with_product (calcular value = qty * preço)
- "cadastrar tomate 6 reais o quilo" => register_product
- "adicionar 10 quilos de tomate" / "10 de tomate no estoque" => stock_add
- "tirar 2 do estoque de banana" => stock_remove
- Identifique o produto por similaridade (singular/plural, acentos). Use o id exato.
- Converta: "meio" = 0.5, "um" = 1, "dois" = 2, etc.
- Se ambíguo ou não entender, retorne action="unknown" com message explicando.`;

    const tools = [{
      type: "function",
      function: {
        name: "register_action",
        description: "Registrar a ação interpretada do comando",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["sale_amount", "adjust_amount", "sale_with_product", "register_product", "stock_add", "stock_remove", "unknown"],
            },
            value: { type: "number", description: "Valor em reais (vendas/ajustes)" },
            quantity: { type: "number", description: "Quantidade (kg, un)" },
            product_id: { type: "string", description: "ID do produto existente" },
            product_name: { type: "string", description: "Nome para cadastro" },
            product_price: { type: "number", description: "Preço unitário para cadastro" },
            product_unit: { type: "string", description: "Unidade (kg, un)" },
            message: { type: "string", description: "Mensagem curta ao usuário" },
          },
          required: ["action"],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "register_action" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI error:", resp.status, t);
      throw new Error("AI gateway error");
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned");

    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("interpret-voice error:", e);
    return new Response(JSON.stringify({
      action: "unknown",
      message: e instanceof Error ? e.message : "Erro ao interpretar",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
