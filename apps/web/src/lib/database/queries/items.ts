"server only";
import { db } from "@/lib/database";
import { inventoryItems } from "@/lib/database/schemas/schema";
import { eq, inArray } from "drizzle-orm";
import type { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2";

const WEAPON_CATEGORY_HASH = 1;
const ARMOR_CATEGORY_HASH = 20;
const DUMMY_CATEGORY_HASH = 3109687656;

let allItemsCache: DestinyInventoryItemDefinition[] | null = null;

const getAllItems = async () => {
  if (allItemsCache) return allItemsCache;
  const res = await db.select().from(inventoryItems);
  allItemsCache = res.map((r) => r.json);
  return allItemsCache;
};

export const getDestinyInventoryItems = async () => {
  const res = await db.select().from(inventoryItems).limit(10);
  if (!res) {
    return [];
  }
  return res.map((v) => v.json);
};

export const getDestinyWeapons = async () => {
  const all = await getAllItems();
  return all.filter(
    (item) =>
      item.itemCategoryHashes?.includes(WEAPON_CATEGORY_HASH) &&
      !item.itemCategoryHashes?.includes(DUMMY_CATEGORY_HASH)
  );
};

export const getDestinyArmor = async () => {
  const all = await getAllItems();
  return all.filter(
    (item) =>
      item.itemCategoryHashes?.includes(ARMOR_CATEGORY_HASH) &&
      !item.itemCategoryHashes?.includes(DUMMY_CATEGORY_HASH)
  );
};

export const getDestinyPerksAndMods = async () => {
  const all = await getAllItems();
  return all.filter((item) => {
    if (!item.plug || !item.displayProperties?.hasIcon) return false;
    const name = item.displayProperties.name;
    if (!name || name.startsWith("Empty ") || name.startsWith("Default ")) return false;
    return true;
  });
};

export const getDestinyItemByHash = async (hash: number) => {
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

export const searchDestinyItems = async (query: string, limit = 8) => {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const all = await getAllItems();
  const matches = all.filter(
    (item) =>
      item.displayProperties?.hasIcon &&
      item.displayProperties?.name?.toLowerCase().includes(q) &&
      !item.redacted
  );
  return matches.slice(0, limit);
};
