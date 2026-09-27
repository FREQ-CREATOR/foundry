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

  const perkHashes = socketEntries
    .map((s: any) => s.singleInitialItemHash)
    .filter((h: number) => !!h);
  const perkItems = await getDestinyItemsByHashes(perkHashes);
  const perkByHash = new Map(perkItems.map((p) => [p.hash, p]));

  const groups = new Map<string, DestinyInventoryItemDefinition[]>();

  socketEntries.forEach((entry: any, socketIndex: number) => {
    const perk = perkByHash.get(entry.singleInitialItemHash);
    if (!perk?.displayProperties?.name || !perk.displayProperties?.hasIcon) return;
    const name = perk.displayProperties.name;
    if (name.startsWith("Empty ") || name.startsWith("Default ")) return;

    const categoryName = categoryNameBySocketIndex.get(socketIndex) ?? "";
    if (!categoryName || categoryName.toUpperCase().includes("COSMETIC")) return;

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

      {stats.length > 0 && (
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
