"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Send, ChefHat, Sparkles } from "lucide-react";
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
      return ["What caused this?", "How do I prevent it next time?", "Will this change the taste?"];
    case "substitution":
      return ["Any other alternatives?", "How does this affect authenticity?", "What about texture?"];
    case "explanation":
      return ["Keep it more authentic", "Reduce calories further", "What else can I change?"];
    default:
      return ["Tell me more", "Can you be more specific?"];
  }
}

function AskPageContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Auto-send message from URL params (e.g., /ask?message=I added too much salt)
  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg && !autoSentRef.current && messages.length === 0) {
      autoSentRef.current = true;
      sendMessage(msg);
    }
  }, [searchParams, messages.length]);

  async function sendMessage(text: string) {
    if (!text.trim() || isTyping) return;

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
          content: "Sorry, I had trouble processing that. Could you rephrase?",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  const showSuggestions = messages.length === 0;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Ask CookPilot" showBack />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg">
          {showSuggestions ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center pt-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                <ChefHat className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="mt-4 font-heading text-xl">
                How can I help you cook?
              </h2>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                Ask about substitutions, rescues, scaling, or anything
                cooking-related
              </p>

              <div className="mt-8 w-full space-y-2.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Suggested prompts
                </p>
                {suggestedPrompts.map((prompt) => (
                  <motion.button
                    key={prompt.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sendMessage(prompt.problem)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition-shadow hover:shadow-md"
                  >
                    <span className="text-xl">{prompt.icon}</span>
                    <span className="text-sm font-medium">
                      {prompt.problem}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
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
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                          <ChefHat className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <HybridResponseCard response={msg.hybridResponse} />
                        </div>
                      </div>
                      <FeedbackButtons
                        targetType={msg.hybridResponse.type === "rescue" ? "rescue" : msg.hybridResponse.type === "substitution" ? "substitution" : "modification"}
                        targetId={msg.id}
                        className="ml-11"
                      />
                      {msg.followUps && msg.followUps.length > 0 && (
                        <div className="ml-11 flex flex-wrap gap-1.5">
                          {msg.followUps.map((fu) => (
                            <button
                              key={fu}
                              onClick={() => sendMessage(fu)}
                              className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              {fu}
                            </button>
                          ))}
                        </div>
                      )}
                      {msg.trace && (
                        <DevTracePanel trace={msg.trace} label={msg.hybridResponse.type} className="ml-11" />
                      )}
                    </div>
                  ) : (
                    <ChatMessage role="assistant" content={msg.content || ""} />
                  )}
                </motion.div>
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <ChefHat className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background px-4 py-3 pb-24 md:pb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="mx-auto flex max-w-lg gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about cooking..."
            className="h-12 flex-1 rounded-2xl border border-border bg-card px-4 text-sm placeholder:text-muted-foreground focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="h-12 w-12 shrink-0 rounded-2xl"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
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
