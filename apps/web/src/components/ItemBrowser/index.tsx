"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ItemSummary, Chip } from "./types";
import styles from "./ItemBrowser.module.scss";

const BUNGIE_ORIGIN = "https://www.bungie.net";

const RARITY_CLASS: Record<string, string> = {
  Common: styles.rarityCommon,
  Uncommon: styles.rarityUncommon,
  Rare: styles.rarityRare,
  Legendary: styles.rarityLegendary,
  Exotic: styles.rarityExotic,
};

const CLASS_TYPE_NAME: Record<number, string> = {
  0: "titan",
  1: "hunter",
  2: "warlock",
};

function matchesChip(item: ItemSummary, chipKey: string): boolean {
  if (chipKey === "all") return true;
  if (chipKey === "exotic") return item.tier === "Exotic";
  if (chipKey === "hunter" || chipKey === "titan" || chipKey === "warlock") {
    return CLASS_TYPE_NAME[item.classType ?? -1] === chipKey;
  }
  return item.perkGroup === chipKey;
}

export function ItemBrowser({
  items,
  chips,
  basePath,
  linkable = true,
}: {
  items: ItemSummary[];
  chips: Chip[];
  basePath: string;
  linkable?: boolean;
}) {
  const [activeChip, setActiveChip] = useState(chips[0]?.key ?? "all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesChip(item, activeChip)) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, activeChip, query]);

  return (
    <div>
      <div className={styles.controls}>
        <input
          className={styles.search}
          type="text"
          placeholder={`Search ${items.length} items...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.chips}>
          {chips.map((chip) => (
            <button
              key={chip.key}
              className={`${styles.chip} ${activeChip === chip.key ? styles.chipActive : ""}`}
              onClick={() => setActiveChip(chip.key)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.count}>{filtered.length} items</p>
      <div className={styles.grid}>
        {filtered.map((item) => {
          const cardClassName = `${styles.card} ${RARITY_CLASS[item.tier ?? ""] ?? ""}`;
          const content = (
            <>
              <Image
                src={`${BUNGIE_ORIGIN}${item.icon}`}
                alt={item.name}
                width={44}
                height={44}
                className={styles.icon}
                unoptimized
              />
              <div className={styles.info}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.type}>{item.type}</span>
                {!linkable && item.description && (
                  <span className={styles.description}>{item.description}</span>
                )}
              </div>
            </>
          );
          return linkable ? (
            <Link key={item.hash} href={`${basePath}/${item.hash}`} className={cardClassName}>
              {content}
            </Link>
          ) : (
            <div key={item.hash} className={cardClassName}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
