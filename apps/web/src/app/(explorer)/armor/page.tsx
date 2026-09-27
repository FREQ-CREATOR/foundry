import { Metadata } from "next";
import { getDestinyArmor } from "@/lib/database/queries/items";
import { ItemBrowser } from "@/components/ItemBrowser";
import styles from "../explorer.module.scss";

export const metadata: Metadata = {
  title: "armor // FOUNDRY",
};

const CHIPS = [
  { key: "all", label: "All" },
  { key: "exotic", label: "Exotic" },
  { key: "hunter", label: "Hunter" },
  { key: "titan", label: "Titan" },
  { key: "warlock", label: "Warlock" },
];

export default async function Page() {
  const allDestinyArmor = await getDestinyArmor();

  const items = (allDestinyArmor || [])
    .filter((a) => a.displayProperties?.hasIcon && !a.redacted)
    .sort((a, b) => a.displayProperties.name.localeCompare(b.displayProperties.name))
    .map((a) => ({
      hash: a.hash,
      name: a.displayProperties.name,
      icon: a.displayProperties.icon,
      type: a.itemTypeDisplayName,
      tier: a.inventory?.tierTypeName,
      classType: a.classType,
    }));

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Armor</h1>
      <ItemBrowser items={items} chips={CHIPS} basePath="/armor" />
    </div>
  );
}
