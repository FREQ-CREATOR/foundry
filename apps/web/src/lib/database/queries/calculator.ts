"server only";
import { getDestinyItemsByHashes } from "./items";
import { getManifestDefinitions } from "./manifest";
import type { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2";

const COSMETIC_PLUG_CATEGORIES = ["shader", "masterworks", "skins", "ornament"];
const INTRINSIC_PLUG_CATEGORIES = ["intrinsics", "frames"];

export type PerkOption = {
  hash: number;
  name: string;
  icon: string;
  description: string;
  investmentStats: { statTypeHash: number; value: number }[];
};

export type PerkColumn = {
  socketIndex: number;
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

    const category = defaultItem.plug.plugCategoryIdentifier ?? "";

    if (INTRINSIC_PLUG_CATEGORIES.includes(category)) {
      intrinsicHash = defaultItem.hash;
      return;
    }

    if (COSMETIC_PLUG_CATEGORIES.some((c) => category.includes(c))) return;

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
      defaultHash: defaultItem.hash,
      options,
    });
  });

  return { intrinsicHash, columns };
};
