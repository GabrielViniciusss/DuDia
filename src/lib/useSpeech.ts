import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  onResult: (transcript: string) => void;
  onError?: (msg: string) => void;
  lang?: string;
}

// Wraps Web Speech API for press-and-hold microphone.
export function useSpeech({ onResult, onError, lang = "pt-BR" }: Options) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const finalRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      onError?.("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
    }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    finalRef.current = "";

    rec.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      finalRef.current = text.trim();
    };
    rec.onerror = (e: any) => {
      onError?.(e?.error || "erro");
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      const text = finalRef.current.trim();
      if (text) onResult(text);
    };

    try {
      rec.start();
      setListening(true);
      recRef.current = rec;
    } catch (e) {
      onError?.("Não foi possível iniciar.");
    }
  }, [lang, onError, onResult]);

  const stop = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
    }
  }, []);

  return { supported, listening, start, stop };
}
