import { Metadata } from "next";
import { getDestinyPerksAndMods } from "@/lib/database/queries/items";
import { classifyPlugCategory, PERK_GROUP_LABEL } from "@/lib/perkCategory";
import { ItemBrowser } from "@/components/ItemBrowser";
import styles from "../explorer.module.scss";

export const metadata: Metadata = {
  title: "perks // FOUNDRY",
};

const CHIPS = [
  { key: "all", label: "All" },
  { key: "weaponPerk", label: PERK_GROUP_LABEL.weaponPerk },
  { key: "intrinsic", label: PERK_GROUP_LABEL.intrinsic },
  { key: "origin", label: PERK_GROUP_LABEL.origin },
  { key: "weaponMod", label: PERK_GROUP_LABEL.weaponMod },
  { key: "armorMod", label: PERK_GROUP_LABEL.armorMod },
];

export default async function Page() {
  const allPerks = await getDestinyPerksAndMods();

  const items = allPerks
    .map((p) => ({
      hash: p.hash,
      name: p.displayProperties.name,
      icon: p.displayProperties.icon,
      type: p.itemTypeDisplayName || "Perk",
      description: p.displayProperties.description,
      perkGroup: classifyPlugCategory(p.plug?.plugCategoryIdentifier ?? "") ?? undefined,
    }))
    .filter((p) => !!p.perkGroup)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Perks &amp; Mods</h1>
      <ItemBrowser items={items} chips={CHIPS} basePath="/perks" linkable={false} />
    </div>
  );
}
