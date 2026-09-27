"server only";
import { getDestinyItemsByHashes } from "./items";
import { getManifestDefinitions } from "./manifest";
import type { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2";

export type PerkOption = {
  hash: number;
  name: string;
  icon: string;
  description: string;
  investmentStats: { statTypeHash: number; value: number }[];
};

export type PerkColumn = {
  socketIndex: number;
  categoryName: string;
  defaultHash: number;
  options: PerkOption[];
};

export type CalculatorData = {
  intrinsicHash: number | null;
  columns: PerkColumn[];
};

function toPerkOption(item: DestinyInventoryItemDefinition): PerkOption {
  return {
    hash: item.hash,
    name: item.displayProperties.name,
    icon: item.displayProperties.icon,
    description: item.displayProperties.description,
    investmentStats: (item.investmentStats ?? []).map((s) => ({
      statTypeHash: s.statTypeHash,
      value: s.value,
    })),
  };
}

export const getWeaponCalculatorData = async (
  weapon: DestinyInventoryItemDefinition
): Promise<CalculatorData> => {
  const socketEntries = (weapon.sockets?.socketEntries ?? []) as any[];
  const socketCategories = (weapon.sockets?.socketCategories ?? []) as any[];

  const categoryHashes = socketCategories.map((c) => c.socketCategoryHash);
  const categoryDefs = await getManifestDefinitions(
    "DestinySocketCategoryDefinition",
    categoryHashes
  );

  const categoryNameBySocketIndex = new Map<number, string>();
  for (const cat of socketCategories) {
    const name = categoryDefs[cat.socketCategoryHash]?.displayProperties?.name ?? "";
    for (const socketIndex of cat.socketIndexes ?? []) {
      categoryNameBySocketIndex.set(socketIndex, name);
    }
  }

  const plugSetHashes = socketEntries
    .map((s) => s.reusablePlugSetHash)
    .filter((h): h is number => !!h);
  const plugSets = await getManifestDefinitions("DestinyPlugSetDefinition", plugSetHashes);

  const allItemHashes = new Set<number>();
  for (const entry of socketEntries) {
    if (entry.singleInitialItemHash) allItemHashes.add(entry.singleInitialItemHash);
    const plugSet = entry.reusablePlugSetHash ? plugSets[entry.reusablePlugSetHash] : null;
    for (const p of plugSet?.reusablePlugItems ?? []) {
      allItemHashes.add(p.plugItemHash);
    }
  }

  const items = await getDestinyItemsByHashes(Array.from(allItemHashes));
  const itemByHash = new Map(items.map((i) => [i.hash, i]));

  let intrinsicHash: number | null = null;
  const columns: PerkColumn[] = [];

  socketEntries.forEach((entry, socketIndex) => {
    const defaultItem = entry.singleInitialItemHash
      ? itemByHash.get(entry.singleInitialItemHash)
      : null;
    if (!defaultItem?.plug) return;

    const categoryName = (categoryNameBySocketIndex.get(socketIndex) ?? "").toUpperCase();

    if (categoryName.includes("INTRINSIC")) {
      intrinsicHash = defaultItem.hash;
      return;
    }

    if (!categoryName.includes("WEAPON PERKS") && !categoryName.includes("WEAPON MODS")) {
      return;
    }

    const plugSet = entry.reusablePlugSetHash ? plugSets[entry.reusablePlugSetHash] : null;
    const optionHashes = plugSet?.reusablePlugItems?.length
      ? plugSet.reusablePlugItems.map((p: any) => p.plugItemHash)
      : [defaultItem.hash];

    const options = optionHashes
      .map((h: number) => itemByHash.get(h))
      .filter(
        (item: any): item is DestinyInventoryItemDefinition =>
          !!item?.displayProperties?.name && item.displayProperties.hasIcon
      )
      .filter((item: DestinyInventoryItemDefinition) => {
        const name = item.displayProperties.name;
        return !name.startsWith("Empty ") && !name.startsWith("Default ");
      })
      .map(toPerkOption);

    if (options.length === 0) return;

    columns.push({
      socketIndex,
      categoryName: categoryName.includes("WEAPON MODS") ? "Weapon Mods" : "Weapon Perks",
      defaultHash: defaultItem.hash,
      options,
    });
  });

  return { intrinsicHash, columns };
};
