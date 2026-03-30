"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  Star,
  Loader2,
  ChefHat,
  Bot,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DevTracePanel } from "@/components/debug/dev-trace-panel";
import type { DebugTrace } from "@/lib/debug/types";

interface SubstituteDetail {
  name: string;
  tier: "best" | "fallback";
  score: number;
  scoreLabel: string;
  quantityInstruction: string;
  authenticityLevel: "authentic" | "adapted" | "modified";
  impact: {
    taste: { score: number; description: string };
    texture: { score: number; description: string };
    authenticity: { score: number; description: string };
    summary: string;
  };
}

interface SubstitutionResponse {
  original: string;
  found: boolean;
  best: SubstituteDetail | null;
  fallback: SubstituteDetail | null;
  all: SubstituteDetail[];
  aiExplanation?: string;
  _trace?: DebugTrace;
}

interface SubstitutionSheetProps {
  ingredientName: string;
  amount?: number;
  unit?: string;
  recipeName?: string;
  cuisine?: string;
  children: React.ReactNode;
}

export function SubstitutionSheet({
  ingredientName,
  amount,
  unit,
  recipeName,
  cuisine,
  children,
}: SubstitutionSheetProps) {
  const [data, setData] = useState<SubstitutionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function fetchSubstitution() {
    if (data) return; // already loaded
    setLoading(true);
    try {
      const res = await fetch("/api/substitution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient: ingredientName,
          amount,
          unit,
          recipeName,
          cuisine,
        }),
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail — sheet shows empty state
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) fetchSubstitution();
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 font-heading text-xl">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Substitute {ingredientName}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 overflow-y-auto pb-8">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!loading && data && !data.found && (
            <div className="py-8 text-center">
              <ChefHat className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No substitutions found for {ingredientName}.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try asking CookGenie for creative alternatives.
              </p>
            </div>
          )}

          {!loading && data?.found && (
            <>
              {data.all.map((sub) => (
                <SubstituteCard key={sub.name} sub={sub} />
              ))}

              {data.aiExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-2xl bg-accent/60 p-4"
                >
                  <div className="flex items-start gap-2">
                    <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <span className="text-xs font-semibold text-primary">
                        CookGenie explains
                      </span>
                      <p className="mt-1 text-xs leading-relaxed text-accent-foreground">
                        {data.aiExplanation}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {data._trace && (
                <DevTracePanel trace={data._trace} label="substitution" />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SubstituteCard({ sub }: { sub: SubstituteDetail }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        sub.tier === "best"
          ? "border-primary/25 bg-card ring-1 ring-primary/10"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">{sub.name}</h4>
          <Badge
            variant={sub.tier === "best" ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0"
          >
            {sub.tier === "best" ? "Best Match" : "Fallback"}
          </Badge>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Star className="h-3 w-3 fill-amber text-amber" />
          {sub.score}%
        </span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        {sub.quantityInstruction}
      </p>

      {/* Impact Bars */}
      <div className="mt-3 space-y-1.5">
        <ImpactBar label="Taste" score={sub.impact.taste.score} note={sub.impact.taste.description} />
        <ImpactBar label="Texture" score={sub.impact.texture.score} note={sub.impact.texture.description} />
        <ImpactBar label="Authenticity" score={sub.impact.authenticity.score} note={sub.impact.authenticity.description} />
      </div>

      <p className="mt-3 text-xs italic text-muted-foreground">
        {sub.impact.summary}
      </p>
    </div>
  );
}

function ImpactBar({
  label,
  score,
  note,
}: {
  label: string;
  score: number;
  note: string;
}) {
  const pct = (score / 5) * 100;
  const color =
    score >= 4
      ? "bg-green-500"
      : score >= 3
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-muted">
        <div
          className={cn("h-1.5 rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-5 text-right text-[10px] tabular-nums text-muted-foreground">
        {score}/5
      </span>
    </div>
  );
}
