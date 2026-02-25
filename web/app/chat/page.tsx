"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Languages } from "lucide-react";
import BackButton from "@/components/BackButton";

type Language = "en" | "es";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const quickQuestions: Record<Language, string[]> = {
  en: [
    "What modules are available?",
    "How do I run a routine?",
    "Where do I see job logs?",
    "Where do I configure settings?",
  ],
  es: [
    "¿Qué módulos hay disponibles?",
    "¿Cómo ejecuto una rutina?",
    "¿Dónde veo los logs de trabajos?",
    "¿Dónde configuro opciones?",
  ],
};

const translations: Record<
  Language,
  {
    title: string;
    subtitle: string;
    welcome: string;
    quickQuestionsLabel: string;
    placeholder: string;
    send: string;
    errorFallback: string;
    errorLabel: string;
  }
> = {
  en: {
    title: "Chatbot",
    subtitle: "Ask me anything about DataHarmony Automation Hub and its modules.",
    welcome:
      "Hello! I'm here to help you with DataHarmony Automation Hub. What would you like to know?",
    quickQuestionsLabel: "Quick Questions",
    placeholder: "Ask a question about the portal...",
    send: "Send",
    errorFallback: "I apologize, but I encountered an error. Please try again.",
    errorLabel: "Error",
  },
  es: {
    title: "Chatbot",
    subtitle: "Pregúntame lo que quieras sobre DataHarmony Automation Hub y sus módulos.",
    welcome:
      "¡Hola! Estoy aquí para ayudarte con DataHarmony Automation Hub. ¿Qué te gustaría saber?",
    quickQuestionsLabel: "Preguntas rápidas",
    placeholder: "Escribe una pregunta sobre el portal...",
    send: "Enviar",
    errorFallback: "Disculpa, hubo un error. Por favor, inténtalo de nuevo.",
    errorLabel: "Error",
  },
};

const getStoredLanguage = (): Language => {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("chat-language");
  return stored === "es" ? "es" : "en";
};

export default function ChatPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: translations.en.welcome,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore language from localStorage on mount; set welcome message only when language was stored
  useEffect(() => {
    const stored = getStoredLanguage();
    setLanguage(stored);
    setMessages((prev) =>
      prev.length === 1 && prev[0].role === "assistant"
        ? [{ role: "assistant", content: translations[stored].welcome }]
        : prev
    );
  }, []);

  const changeLanguage = (lang: Language) => {
    if (lang === language) return;
    setLanguage(lang);
    localStorage.setItem("chat-language", lang);
    setMessages([{ role: "assistant", content: translations[lang].welcome }]);
  };

  const t = translations[language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages, language }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();
      const assistantMessage: Message = { role: "assistant", content: data.reply };
      setMessages([...newMessages, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: t.errorFallback,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{t.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <span className="px-2 text-slate-500" aria-hidden>
            <Languages className="h-4 w-4" />
          </span>
          <button
            type="button"
            onClick={() => changeLanguage("en")}
            aria-pressed={language === "en"}
            aria-label="English"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              language === "en"
                ? "bg-white text-cyan-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-800"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => changeLanguage("es")}
            aria-pressed={language === "es"}
            aria-label="Español"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              language === "es"
                ? "bg-white text-cyan-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-800"
            }`}
          >
            ES
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-cyan-500 to-teal-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-slate-100 px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            </div>
          )}
          
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {t.errorLabel}: {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length === 1 && (
          <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {t.quickQuestionsLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions[language].map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-slate-200 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:from-cyan-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t.send}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
