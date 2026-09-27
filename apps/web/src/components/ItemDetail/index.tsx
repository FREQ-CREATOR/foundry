import Image from "next/image";
import Link from "next/link";
import { getDestinyItemsByHashes } from "@/lib/database/queries/items";
import { getManifestDefinitions } from "@/lib/database/queries/manifest";
import type { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2";
import styles from "./ItemDetail.module.scss";

const BUNGIE_ORIGIN = "https://www.bungie.net";

type PerkGroup = {
  name: string;
  perks: DestinyInventoryItemDefinition[];
};

async function getPerkGroups(item: DestinyInventoryItemDefinition): Promise<PerkGroup[]> {
  const socketEntries = (item.sockets?.socketEntries ?? []) as any[];
  const socketCategories = (item.sockets?.socketCategories ?? []) as any[];

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

  const plugSetHashOf = (entry: any): number | null =>
    entry.reusablePlugSetHash || entry.randomizedPlugSetHash || null;

  const plugSetHashes = socketEntries.map(plugSetHashOf).filter((h): h is number => !!h);
  const plugSets = await getManifestDefinitions("DestinyPlugSetDefinition", plugSetHashes);

  const perkHashes = new Set<number>();
  for (const entry of socketEntries) {
    if (entry.singleInitialItemHash) perkHashes.add(entry.singleInitialItemHash);
    const plugSetHash = plugSetHashOf(entry);
    const plugSet = plugSetHash ? plugSets[plugSetHash] : null;
    if (plugSet?.reusablePlugItems?.[0]) perkHashes.add(plugSet.reusablePlugItems[0].plugItemHash);
  }
  const perkItems = await getDestinyItemsByHashes(Array.from(perkHashes));
  const perkByHash = new Map(perkItems.map((p) => [p.hash, p]));

  const groups = new Map<string, DestinyInventoryItemDefinition[]>();

  socketEntries.forEach((entry: any, socketIndex: number) => {
    const categoryName = categoryNameBySocketIndex.get(socketIndex) ?? "";
    if (!categoryName || categoryName.toUpperCase().includes("COSMETIC")) return;

    let perk = entry.singleInitialItemHash ? perkByHash.get(entry.singleInitialItemHash) : null;
    if (!perk) {
      const plugSetHash = plugSetHashOf(entry);
      const plugSet = plugSetHash ? plugSets[plugSetHash] : null;
      const firstHash = plugSet?.reusablePlugItems?.[0]?.plugItemHash;
      perk = firstHash ? perkByHash.get(firstHash) : undefined;
    }
    if (!perk?.displayProperties?.name || !perk.displayProperties?.hasIcon) return;
    const name = perk.displayProperties.name;
    if (name.startsWith("Empty ") || name.startsWith("Default ")) return;

    if (!groups.has(categoryName)) groups.set(categoryName, []);
    groups.get(categoryName)!.push(perk);
  });

  return Array.from(groups.entries()).map(([name, perks]) => ({ name, perks }));
}

export async function ItemDetail({
  item,
  backHref,
  backLabel,
  calculator,
}: {
  item: DestinyInventoryItemDefinition;
  backHref: string;
  backLabel: string;
  calculator?: React.ReactNode;
}) {
  const statHashes = Object.keys(item.stats?.stats ?? {}).map(Number);
  const statDefs = await getManifestDefinitions("DestinyStatDefinition", statHashes);

  const damageTypeHash = item.defaultDamageTypeHash;
  const damageTypeDefs = damageTypeHash
    ? await getManifestDefinitions("DestinyDamageTypeDefinition", [damageTypeHash])
    : {};
  const damageType = damageTypeHash ? damageTypeDefs[damageTypeHash] : null;

  const perkGroups = await getPerkGroups(item);

  const stats = Object.values(item.stats?.stats ?? {})
    .filter((s: any) => statDefs[s.statHash]?.displayProperties?.name)
    .sort((a: any, b: any) => b.value - a.value);

  return (
    <div className={styles.page}>
      <Link href={backHref} className={styles.back}>
        ← {backLabel}
      </Link>
      <div className={styles.header}>
        <Image
          src={`${BUNGIE_ORIGIN}${item.displayProperties.icon}`}
          alt={item.displayProperties.name}
          width={96}
          height={96}
          className={styles.icon}
          unoptimized
        />
        <div>
          <h1 className={styles.name}>{item.displayProperties.name}</h1>
          <div className={styles.meta}>
            <span>{item.itemTypeDisplayName}</span>
            {damageType?.displayProperties?.name && (
              <span> • {damageType.displayProperties.name}</span>
            )}
            {item.inventory?.tierTypeName && <span> • {item.inventory.tierTypeName}</span>}
          </div>
        </div>
      </div>

      {item.flavorText && <p className={styles.flavor}>{item.flavorText}</p>}
      {item.displayProperties.description && (
        <p className={styles.description}>{item.displayProperties.description}</p>
      )}

      {calculator && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Calculator</h2>
          {calculator}
        </section>
      )}

      {!calculator && stats.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Stats</h2>
          <div className={styles.statList}>
            {stats.map((s: any) => (
              <div key={s.statHash} className={styles.statRow}>
                <span className={styles.statName}>
                  {statDefs[s.statHash]?.displayProperties?.name}
                </span>
                <div className={styles.statBarTrack}>
                  <div
                    className={styles.statBarFill}
                    style={{ width: `${Math.min(100, s.value)}%` }}
                  />
                </div>
                <span className={styles.statValue}>{s.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {perkGroups
        .filter(
          (group) =>
            !calculator || !["WEAPON PERKS", "WEAPON MODS"].includes(group.name.toUpperCase())
        )
        .map((group) => (
        <section key={group.name} className={styles.section}>
          <h2 className={styles.sectionTitle}>{group.name}</h2>
          <div className={styles.perkGrid}>
            {group.perks.map((p) => (
              <div key={p.hash} className={styles.perk}>
                <Image
                  src={`${BUNGIE_ORIGIN}${p.displayProperties.icon}`}
                  alt={p.displayProperties.name}
                  width={40}
                  height={40}
                  className={styles.perkIcon}
                  unoptimized
                />
                <div>
                  <div className={styles.perkName}>{p.displayProperties.name}</div>
                  <div className={styles.perkDescription}>{p.displayProperties.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
