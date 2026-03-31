"use client";

import { ChevronLeft, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
  transparent?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

export function AppHeader({
  title,
  showBack = false,
  showHome = false,
  transparent = false,
  rightAction,
  className,
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center justify-between px-4",
        transparent
          ? "bg-gradient-to-b from-black/40 to-transparent"
          : "border-b border-border bg-background/80 backdrop-blur-xl",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={() => router.back()}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
              transparent
                ? "bg-black/20 text-white hover:bg-black/30"
                : "hover:bg-muted"
            )}
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {showHome && !showBack && (
          <Link
            href="/"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
              transparent
                ? "bg-black/20 text-white hover:bg-black/30"
                : "hover:bg-muted"
            )}
            aria-label="Go home"
          >
            <Home className="h-5 w-5" />
          </Link>
        )}
        {title && (
          <h1 className={cn(
            "text-lg font-semibold tracking-tight",
            transparent && "text-white drop-shadow-md"
          )}>{title}</h1>
        )}
      </div>
      {rightAction && <div>{rightAction}</div>}
    </header>
  );
}
