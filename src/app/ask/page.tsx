"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ChefHat, Sparkles, Flame, ArrowRightLeft, Sliders, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/layout/app-header";
import { ChatMessage } from "@/components/ai/chat-message";
import { HybridResponseCard } from "@/components/ai/hybrid-response-card";
import { DevTracePanel } from "@/components/debug/dev-trace-panel";
import { FeedbackButtons } from "@/components/shared/feedback-buttons";
import { suggestedPrompts } from "@/data/mock-data";
import type { HybridResponse } from "@/lib/hybrid/types";
import type { DebugTrace } from "@/lib/debug/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content?: string;
  hybridResponse?: HybridResponse;
  trace?: DebugTrace;
  followUps?: string[];
}

function getFollowUps(response: HybridResponse): string[] {
  switch (response.type) {
    case "rescue":
      return ["What caused this?", "How to prevent next time?", "Will it change the taste?"];
    case "substitution":
      return ["Any other alternatives?", "How does this affect authenticity?", "What about texture?"];
    case "explanation":
      return ["Keep it more authentic", "Reduce calories further", "What else can I change?"];
    default:
      return ["Tell me more", "Can you be more specific?"];
  }
}

const starterCategories = [
  {
    icon: Flame,
    label: "Rescue",
    color: "text-red-500",
    bg: "bg-red-50 border-red-100",
    examples: ["I added too much salt", "My curry is too watery", "The sauce is burning"],
  },
  {
    icon: ArrowRightLeft,
    label: "Substitute",
    color: "text-sky-500",
    bg: "bg-sky-50 border-sky-100",
    examples: ["I don't have cream", "Replace butter with olive oil", "No fresh ginger"],
  },
  {
    icon: Sliders,
    label: "Adapt",
    color: "text-emerald-500",
    bg: "bg-emerald-50 border-emerald-100",
    examples: ["Make this healthier", "Reduce spice level", "Adjust for 8 people"],
  },
];

function AskPageContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg && !autoSentRef.current && messages.length === 0) {
      autoSentRef.current = true;
      sendMessage(msg);
    }
  }, [searchParams, messages.length]);

  async function sendMessage(text: string) {
    if (!text.trim() || isTyping) return;
    setActiveCategory(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      const { _trace, ...response } = data as HybridResponse & { _trace?: DebugTrace };

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          hybridResponse: response,
          content: response.type === "general" ? response.explanation : undefined,
          trace: _trace,
          followUps: getFollowUps(response),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Sorry, I had trouble with that. Please try rephrasing your question.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  const showWelcome = messages.length === 0;

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader
        title="Ask CookGenie"
        showBack
        rightAction={
          messages.length > 0 ? (
            <button
              onClick={() => {
                setMessages([]);
                autoSentRef.current = false;
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear chat"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : undefined
        }
      />

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4">
          {showWelcome ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-6 pb-4"
            >
              {/* Welcome header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-float">
                    <ChefHat className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </div>
                </div>
                <h2 className="font-heading text-2xl text-balance">
                  How can I help you cook?
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Ask about rescues, substitutions, scaling, adapting for dietary needs, or anything cooking-related.
                </p>
              </div>

              {/* Category cards */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {starterCategories.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() =>
                      setActiveCategory(
                        activeCategory === cat.label ? null : cat.label
                      )
                    }
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-center transition-all ${
                      activeCategory === cat.label
                        ? `${cat.bg} ring-2 ring-current shadow-card`
                        : "border-border bg-card shadow-card hover:shadow-card-hover"
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 ${cat.color}`}>
                      <cat.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Category examples */}
              <AnimatePresence>
                {activeCategory && (
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 space-y-2"
                  >
                    {starterCategories
                      .find((c) => c.label === activeCategory)
                      ?.examples.map((ex) => (
                        <motion.button
                          key={ex}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => sendMessage(ex)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-card transition-all hover:shadow-card-hover hover:border-primary/20"
                        >
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="text-sm text-foreground">{ex}</span>
                        </motion.button>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Suggested prompts */}
              {!activeCategory && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Popular questions
                  </p>
                  {suggestedPrompts.map((prompt) => (
                    <motion.button
                      key={prompt.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => sendMessage(prompt.problem)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-card transition-all hover:shadow-card-hover hover:border-primary/20"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-base">
                        {prompt.icon}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {prompt.problem}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="py-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {msg.role === "user" ? (
                    <ChatMessage role="user" content={msg.content || ""} />
                  ) : msg.hybridResponse ? (
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md">
                          <ChefHat className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <HybridResponseCard response={msg.hybridResponse} />
                        </div>
                      </div>
                      <FeedbackButtons
                        targetType={
                          msg.hybridResponse.type === "rescue"
                            ? "rescue"
                            : msg.hybridResponse.type === "substitution"
                              ? "substitution"
                              : "modification"
                        }
                        targetId={msg.id}
                        className="ml-11"
                      />
                      {msg.followUps && msg.followUps.length > 0 && (
                        <div className="ml-11 flex flex-wrap gap-1.5">
                          {msg.followUps.map((fu) => (
                            <button
                              key={fu}
                              onClick={() => sendMessage(fu)}
                              className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground hover:border-primary/20"
                            >
                              {fu}
                            </button>
                          ))}
                        </div>
                      )}
                      {msg.trace && (
                        <DevTracePanel
                          trace={msg.trace}
                          label={msg.hybridResponse.type}
                          className="ml-11"
                        />
                      )}
                    </div>
                  ) : (
                    <ChatMessage role="assistant" content={msg.content || ""} />
                  )}
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md">
                    <ChefHat className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-background/95 backdrop-blur-xl px-4 py-3 pb-24 md:pb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="mx-auto flex max-w-lg gap-2.5"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about cooking..."
              className="h-12 w-full rounded-2xl border border-border bg-card px-4 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-card transition-shadow focus:shadow-card-hover"
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="h-12 w-12 shrink-0 rounded-2xl shadow-md transition-all disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60 mx-auto max-w-lg">
          AI responses are suggestions — always trust your instincts in the kitchen
        </p>
      </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense>
      <AskPageContent />
    </Suspense>
  );
}
