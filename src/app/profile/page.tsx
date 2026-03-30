"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChefHat,
  BookOpen,
  Clock,
  Heart,
  Settings,
  ChevronRight,
  Flame,
  Ruler,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/layout/app-header";

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
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const prefs = data?.preferences;
  const dietary = prefs?.dietary ?? [];
  const cuisines = prefs?.cuisines ?? [];

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
    <div className="min-h-screen">
      <AppHeader title="Profile" />

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-heading">
              N
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-heading text-xl">Home Chef</h2>
            <p className="text-sm text-muted-foreground">
              Cooking since January 2026
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
                className="flex flex-col items-center rounded-2xl border border-border bg-card p-4"
              >
                <stat.icon className="h-5 w-5 text-primary" />
                <span className="mt-2 text-lg font-bold tabular-nums">
                  {stat.value}
                </span>
                <span className="mt-0.5 text-center text-[11px] text-muted-foreground">
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
              <h3 className="text-sm font-semibold text-muted-foreground">
                Dietary Preferences
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {dietary.length > 0 ? (
                  dietary.map((pref) => (
                    <Badge
                      key={pref}
                      variant="secondary"
                      className="rounded-full"
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
              <h3 className="text-sm font-semibold text-muted-foreground">
                Favorite Cuisines
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {cuisines.length > 0 ? (
                  cuisines.map((cuisine) => (
                    <Badge
                      key={cuisine}
                      variant="outline"
                      className="rounded-full"
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
              className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="text-xs text-muted-foreground">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
