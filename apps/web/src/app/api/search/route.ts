import { NextRequest, NextResponse } from "next/server";
import { getDestinyArmor, getDestinyWeapons } from "@/lib/database/queries/items";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const [weapons, armor] = await Promise.all([getDestinyWeapons(), getDestinyArmor()]);

  const matchWeapons = weapons
    .filter(
      (w) =>
        w.displayProperties?.hasIcon &&
        !w.redacted &&
        w.displayProperties.name.toLowerCase().includes(q)
    )
    .slice(0, 6)
    .map((w) => ({
      hash: w.hash,
      name: w.displayProperties.name,
      icon: w.displayProperties.icon,
      type: w.itemTypeDisplayName,
      section: "weapons" as const,
    }));

  const matchArmor = armor
    .filter(
      (a) =>
        a.displayProperties?.hasIcon &&
        !a.redacted &&
        a.displayProperties.name.toLowerCase().includes(q)
    )
    .slice(0, 6)
    .map((a) => ({
      hash: a.hash,
      name: a.displayProperties.name,
      icon: a.displayProperties.icon,
      type: a.itemTypeDisplayName,
      section: "armor" as const,
    }));

  return NextResponse.json({ results: [...matchWeapons, ...matchArmor].slice(0, 10) });
}
