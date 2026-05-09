export interface TutorialStep {
  text: string;
  // Optional: small delay before next step (ms)
  pause?: number;
}

export const TUTORIALS: Record<string, TutorialStep[]> = {
  app: [
    { text: "Olá! Eu sou o DuDia, seu ajudante na feira. Vou te ensinar a usar, com calma." },
    { text: "Tudo aqui pode ser feito falando. Você não precisa ler nem escrever nada." },
    { text: "Para falar comigo, segure o botão grande do microfone no centro da tela e fale." },
    { text: "Por exemplo: diga, vendi três reais de tomate. Eu somo no total e tiro do estoque." },
    { text: "Para cadastrar um produto novo, diga: cadastrar tomate, seis reais o quilo." },
    { text: "Para ver suas vendas do dia, basta olhar o número grande no topo da tela." },
    {
      text: "Se quiser, diga me ensine a vender, ou me ensine a cadastrar produto, e eu te explico de novo.",
    },
    { text: "Pronto! Pode começar a trabalhar. Estou aqui se precisar." },
  ],
  vender: [
    { text: "Vamos aprender a registrar uma venda." },
    { text: "Primeiro, segure o microfone no centro da tela." },
    { text: "Depois, fale o valor e o produto. Por exemplo: vendi cinco reais de banana." },
    { text: "Eu vou somar no total do dia e descontar do estoque automaticamente." },
    { text: "Se errou, diga desfazer, ou aperte o botão de voltar." },
    { text: "Pronto, você já sabe vender!" },
  ],
  cadastrar: [
    { text: "Vamos cadastrar um produto novo." },
    { text: "Segure o microfone e fale assim: cadastrar, nome do produto, preço, e a unidade." },
    { text: "Por exemplo: cadastrar couve-flor, cinco reais a unidade." },
    { text: "Ou: cadastrar tomate, seis reais o quilo." },
    { text: "Depois você pode adicionar estoque dizendo: adicionar dez quilos de tomate." },
    { text: "Pronto, seu produto está na lista!" },
  ],
  estoque: [
    { text: "Vamos falar do estoque." },
    { text: "Para adicionar, diga: adicionar dez quilos de tomate." },
    { text: "Para tirar, diga: tirar dois do estoque de banana." },
    { text: "Quando o estoque estiver acabando, eu mostro um aviso na tela." },
  ],
};

export function pickTutorial(transcript: string): TutorialStep[] | null {
  const t = transcript
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!/(me ensine|me ensina|como (eu )?(uso|faco|fazer)|tutorial|me ajude|me ajuda)/.test(t)) {
    return null;
  }
  if (/cadastr/.test(t)) return TUTORIALS.cadastrar;
  if (/vend/.test(t)) return TUTORIALS.vender;
  if (/estoqu/.test(t)) return TUTORIALS.estoque;
  return TUTORIALS.app;
}

let cancelled = false;

export async function runTutorial(
  steps: TutorialStep[],
  onStep?: (idx: number, total: number, text: string) => void,
): Promise<void> {
  cancelled = false;
  for (let i = 0; i < steps.length; i++) {
    if (cancelled) return;
    const step = steps[i];
    onStep?.(i, steps.length, step.text);
    if (cancelled) return;
    await new Promise((r) => setTimeout(r, step.pause ?? 2500));
  }
  onStep?.(steps.length, steps.length, "");
}

export function stopTutorial() {
  cancelled = true;
}
