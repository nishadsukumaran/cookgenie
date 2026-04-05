"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn, signOut } from "next-auth/react"
import { motion } from "framer-motion"
import {
  ChefHat,
  BookOpen,
  Clock,
  Heart,
  Settings,
  ChevronRight,
  Flame,
  Ruler,
  Loader2,
  LogIn,
  LogOut,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AppHeader } from "@/components/layout/app-header"

interface UserPreferences {
  spicePreference: string | null;
  dietary: string[] | null;
  cuisines: string[] | null;
  calorieGoal: number | null;
  authenticityPreference: string | null;
  unitSystem: string | null;
}

interface ProfileData {
  preferences: UserPreferences | null;
  activeSessionCount: number;
  savedCount: number;
}

function formatSpice(value: string | null | undefined): string {
  if (!value) return "Medium";
  const map: Record<string, string> = {
    mild: "Mild",
    medium: "Medium",
    hot: "Hot",
    very_hot: "Very Hot",
  };
  return map[value] ?? value;
}

function formatUnit(value: string | null | undefined): string {
  if (!value) return "Metric";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDietaryLabel(value: string): string {
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatCuisineLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function StatsGridSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-col items-center rounded-2xl border border-border bg-card p-4"
        >
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="mt-2 h-6 w-8" />
          <Skeleton className="mt-1 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function PreferencesSkeleton() {
  return (
    <>
      <div className="mt-6">
        <Skeleton className="h-4 w-32" />
        <div className="mt-2 flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="mt-4">
        <Skeleton className="h-4 w-32" />
        <div className="mt-2 flex flex-wrap gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const isLoggedIn = status === "authenticated";

  useEffect(() => {
    if (!isLoggedIn) return;

    async function fetchProfileData() {
      try {
        const [prefsRes, sessionsRes, savedRes] = await Promise.all([
          fetch("/api/preferences"),
          fetch("/api/sessions/active"),
          fetch("/api/saved"),
        ]);

        const prefsJson = await prefsRes.json();
        const sessionsJson = await sessionsRes.json();
        const savedJson = await savedRes.json();

        setData({
          preferences: prefsJson.preferences ?? null,
          activeSessionCount: sessionsJson.sessions?.length ?? 0,
          savedCount: savedJson.savedRecipeIds?.length ?? 0,
        });
      } catch {
        // Graceful degradation — show empty state
        setData({
          preferences: null,
          activeSessionCount: 0,
          savedCount: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, [isLoggedIn]);

  // Loading auth state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in — show login prompt
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <AppHeader title="Profile" />
        <div className="flex flex-col items-center justify-center px-4 pt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center space-y-6"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <ChefHat className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold">Sign in to your account</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Save recipes, track sessions, and sync your preferences across devices.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              Sign in with Google
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  const prefs = data?.preferences;
  const dietary = prefs?.dietary ?? [];
  const cuisines = prefs?.cuisines ?? [];
  const userName = session?.user?.name ?? "Home Chef";
  const userEmail = session?.user?.email ?? "";
  const userImage = session?.user?.image ?? null;
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Format "Cooking since" from user creation
  const cookingSince = (session?.user as any)?.createdAt
    ? new Date((session.user as any).createdAt as string).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "January 2026";

  const stats = [
    {
      label: "Active Sessions",
      value: loading ? "—" : String(data?.activeSessionCount ?? 0),
      icon: BookOpen,
    },
    {
      label: "Hours Cooking",
      value: "—",
      icon: Clock,
    },
    {
      label: "Favorites",
      value: loading ? "—" : String(data?.savedCount ?? 0),
      icon: Heart,
    },
  ];

  const menuItems = [
    {
      label: "Dietary Preferences",
      icon: Heart,
      badge: loading
        ? "…"
        : dietary.length > 0
          ? `${dietary.length} set`
          : "None",
    },
    {
      label: "Cuisine Preferences",
      icon: ChefHat,
      badge: loading
        ? "…"
        : cuisines.length > 0
          ? `${cuisines.length} cuisine${cuisines.length !== 1 ? "s" : ""}`
          : "None",
    },
    {
      label: "Spice Level",
      icon: Flame,
      badge: loading ? "…" : formatSpice(prefs?.spicePreference),
    },
    {
      label: "Unit System",
      icon: Ruler,
      badge: loading ? "…" : formatUnit(prefs?.unitSystem),
    },
    {
      label: "Cooking History",
      icon: Clock,
    },
    {
      label: "App Settings",
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Profile" />

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Avatar className="h-16 w-16">
            {userImage ? <AvatarImage src={userImage} /> : null}
            <AvatarFallback className="bg-primary text-white text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-2xl font-bold text-foreground truncate">{userName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{userEmail}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Cooking since {cookingSince}
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        {loading ? (
          <StatsGridSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-6 grid grid-cols-3 gap-3"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-lg border border-border bg-card p-4 shadow-card hover:shadow-card-hover transition-all duration-300"
              >
                <stat.icon className="h-5 w-5 text-primary" />
                <span className="mt-2 text-xl font-bold tabular-nums text-foreground">
                  {stat.value}
                </span>
                <span className="mt-0.5 text-center text-xs text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Preferences */}
        {loading ? (
          <PreferencesSkeleton />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Dietary Preferences
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {dietary.length > 0 ? (
                  dietary.map((pref) => (
                    <Badge
                      key={pref}
                      className="rounded-full bg-accent text-foreground hover:bg-accent/80"
                    >
                      {formatDietaryLabel(pref)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No dietary preferences set
                  </span>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-4"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Favorite Cuisines
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {cuisines.length > 0 ? (
                  cuisines.map((cuisine) => (
                    <Badge
                      key={cuisine}
                      variant="outline"
                      className="rounded-full border-border bg-surface text-foreground hover:bg-surface-raised"
                    >
                      {formatCuisineLabel(cuisine)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No cuisine preferences set
                  </span>
                )}
              </div>
            </motion.div>
          </>
        )}

        <Separator className="my-6" />

        {/* Menu */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-1"
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center justify-between rounded-lg px-4 py-3.5 transition-colors hover:bg-surface active:bg-muted"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}

          {/* Sign out */}
          <Separator className="my-2" />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center justify-between rounded-lg px-4 py-3.5 transition-colors hover:bg-red-50 active:bg-red-100 text-red-600"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Sign Out</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </div>
  )
}
