import { NextResponse } from "next/server";
import { getPreferences, upsertPreferences } from "@/lib/db/queries";
import { getUserId } from "@/lib/auth/session";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ preferences: null });
  }
  const prefs = await getPreferences(userId);
  return NextResponse.json({ preferences: prefs });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const id = await upsertPreferences(userId, {
    spicePreference: body.spicePreference,
    dietary: body.dietary,
    cuisines: body.cuisines,
    calorieGoal: body.calorieGoal,
    authenticityPreference: body.authenticityPreference,
    unitSystem: body.unitSystem,
  });

  return NextResponse.json({ id });
}
