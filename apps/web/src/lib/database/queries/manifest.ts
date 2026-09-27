"server only";
import { db } from "@/lib/database";
import { manifestDefinitions } from "@/lib/database/schemas/schema";
import { and, eq, inArray } from "drizzle-orm";

export const getManifestDefinitions = async (table: string, hashes: number[]) => {
  if (hashes.length === 0) return {} as Record<number, any>;
  const res = await db
    .select()
    .from(manifestDefinitions)
    .where(and(eq(manifestDefinitions.table, table), inArray(manifestDefinitions.hash, hashes)));
  const out: Record<number, any> = {};
  for (const row of res) {
    out[row.hash] = row.json;
  }
  return out;
};
