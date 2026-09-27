import Image from "next/image";
import Link from "next/link";
import { getDestinyItemsByHashes } from "@/lib/database/queries/items";
import { getManifestDefinitions } from "@/lib/database/queries/manifest";
import type { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2";
import styles from "./ItemDetail.module.scss";

const BUNGIE_ORIGIN = "https://www.bungie.net";
const COSMETIC_PLUG_CATEGORIES = ["shader", "masterworks", "skins"];

export async function ItemDetail({
  item,
  backHref,
  backLabel,
}: {
  item: DestinyInventoryItemDefinition;
  backHref: string;
  backLabel: string;
}) {
  const statHashes = Object.keys(item.stats?.stats ?? {}).map(Number);
  const statDefs = await getManifestDefinitions("DestinyStatDefinition", statHashes);

  const damageTypeHash = item.defaultDamageTypeHash;
  const damageTypeDefs = damageTypeHash
    ? await getManifestDefinitions("DestinyDamageTypeDefinition", [damageTypeHash])
    : {};
  const damageType = damageTypeHash ? damageTypeDefs[damageTypeHash] : null;

  const socketEntries = item.sockets?.socketEntries ?? [];
  const perkHashes = socketEntries
    .map((s: any) => s.singleInitialItemHash)
    .filter((h: number) => !!h);
  const perkItems = await getDestinyItemsByHashes(perkHashes);
  const perkByHash = new Map(perkItems.map((p) => [p.hash, p]));

  const perks = socketEntries
    .map((s: any) => perkByHash.get(s.singleInitialItemHash))
    .filter((p: any) => {
      if (!p || !p.displayProperties?.name || !p.displayProperties?.hasIcon) return false;
      const name: string = p.displayProperties.name;
      if (name.startsWith("Empty ") || name.startsWith("Default ")) return false;
      const category = p.plug?.plugCategoryIdentifier ?? "";
      return !COSMETIC_PLUG_CATEGORIES.some((c) => category.includes(c));
    });

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

      {perks.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Perks</h2>
          <div className={styles.perkGrid}>
            {perks.map((p: any) => (
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
      )}
    </div>
  );
}
