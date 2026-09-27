"server only";
import { db } from "@/lib/database";
import { inventoryItems } from "@/lib/database/schemas/schema";
import { eq, inArray } from "drizzle-orm";

export const getDestinyInventoryItems = async () => {
  const res = await db.select().from(inventoryItems).limit(10);
  if (!res) {
    return [];
  }
  return res.map((v) => v.json);
};

export const getDestinyWeapons = async () => {
  const res = await db.select().from(inventoryItems);
  if (!res) {
    return [];
  }
  return res
    .map((r) => r.json)
    .filter(
      (item) =>
        item.itemCategoryHashes?.includes(1) &&
        !item.itemCategoryHashes?.includes(3109687656)
    );
};

export const getDestinyWeaponsByItemType = async () => {
  const res = await getDestinyWeapons();
};

export const getDestinyWeaponByHash = async (hash: number) => {
  const res = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.id, hash))
    .limit(1);
  return res[0]?.json ?? null;
};

export const getDestinyItemsByHashes = async (hashes: number[]) => {
  if (hashes.length === 0) return [];
  const res = await db
    .select()
    .from(inventoryItems)
    .where(inArray(inventoryItems.id, hashes));
  return res.map((r) => r.json);
};
