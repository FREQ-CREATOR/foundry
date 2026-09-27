import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDestinyItemsByHashes, getDestinyWeaponByHash } from "@/lib/database/queries/items";
import { getManifestDefinitions } from "@/lib/database/queries/manifest";
import styles from "./detail.module.scss";

const BUNGIE_ORIGIN = "https://www.bungie.net";
const COSMETIC_PLUG_CATEGORIES = ["shader", "masterworks", "skins"];

export default async function WeaponDetailPage({ params }: { params: { hash: string } }) {
  const hash = Number(params.hash);
  const weapon = await getDestinyWeaponByHash(hash);
  if (!weapon) notFound();

  const statHashes = Object.keys(weapon.stats?.stats ?? {}).map(Number);
  const statDefs = await getManifestDefinitions("DestinyStatDefinition", statHashes);

  const damageTypeHash = weapon.defaultDamageTypeHash;
  const damageTypeDefs = damageTypeHash
    ? await getManifestDefinitions("DestinyDamageTypeDefinition", [damageTypeHash])
    : {};
  const damageType = damageTypeHash ? damageTypeDefs[damageTypeHash] : null;

  const socketEntries = weapon.sockets?.socketEntries ?? [];
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

  const stats = Object.values(weapon.stats?.stats ?? {})
    .filter((s: any) => statDefs[s.statHash]?.displayProperties?.name)
    .sort((a: any, b: any) => b.value - a.value);

  return (
    <div className={styles.page}>
      <Link href="/weapons" className={styles.back}>
        ← Weapons
      </Link>
      <div className={styles.header}>
        <Image
          src={`${BUNGIE_ORIGIN}${weapon.displayProperties.icon}`}
          alt={weapon.displayProperties.name}
          width={96}
          height={96}
          className={styles.icon}
          unoptimized
        />
        <div>
          <h1 className={styles.name}>{weapon.displayProperties.name}</h1>
          <div className={styles.meta}>
            <span>{weapon.itemTypeDisplayName}</span>
            {damageType?.displayProperties?.name && (
              <span> • {damageType.displayProperties.name}</span>
            )}
            {weapon.inventory?.tierTypeName && <span> • {weapon.inventory.tierTypeName}</span>}
          </div>
        </div>
      </div>

      {weapon.flavorText && <p className={styles.flavor}>{weapon.flavorText}</p>}
      {weapon.displayProperties.description && (
        <p className={styles.description}>{weapon.displayProperties.description}</p>
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
