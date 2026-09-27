import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { getDestinyWeapons } from "@/lib/database/queries/items";
import styles from "./weapons.module.scss";

export const metadata: Metadata = {
  title: "weapons // FOUNDRY",
};

const BUNGIE_ORIGIN = "https://www.bungie.net";
const RARITY_CLASS: Record<string, string> = {
  Common: styles.rarityCommon,
  Uncommon: styles.rarityUncommon,
  Rare: styles.rarityRare,
  Legendary: styles.rarityLegendary,
  Exotic: styles.rarityExotic,
};

export default async function Page() {
  const allDestinyWeapons = await getDestinyWeapons();

  const weapons = (allDestinyWeapons || [])
    .filter((w) => w.displayProperties?.hasIcon && !w.redacted)
    .sort((a, b) => a.displayProperties.name.localeCompare(b.displayProperties.name));

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Weapons</h1>
      <p className={styles.subtitle}>{weapons.length} weapons</p>
      <div className={styles.grid}>
        {weapons.map((w) => (
          <Link
            key={w.hash}
            href={`/weapons/${w.hash}`}
            className={`${styles.card} ${RARITY_CLASS[w.inventory?.tierTypeName ?? ""] ?? ""}`}
          >
            <Image
              src={`${BUNGIE_ORIGIN}${w.displayProperties.icon}`}
              alt={w.displayProperties.name}
              width={64}
              height={64}
              className={styles.icon}
              unoptimized
            />
            <div className={styles.info}>
              <span className={styles.name}>{w.displayProperties.name}</span>
              <span className={styles.type}>{w.itemTypeDisplayName}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
