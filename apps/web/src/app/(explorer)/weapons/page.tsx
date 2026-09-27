import { Metadata } from "next";
import { getDestinyWeapons } from "@/lib/database/queries/items";
import { ItemBrowser } from "@/components/ItemBrowser";
import styles from "../explorer.module.scss";

export const metadata: Metadata = {
  title: "weapons // FOUNDRY",
};

const CHIPS = [
  { key: "all", label: "All" },
  { key: "exotic", label: "Exotic" },
];

export default async function Page() {
  const allDestinyWeapons = await getDestinyWeapons();

  const items = (allDestinyWeapons || [])
    .filter((w) => w.displayProperties?.hasIcon && !w.redacted)
    .sort((a, b) => a.displayProperties.name.localeCompare(b.displayProperties.name))
    .map((w) => ({
      hash: w.hash,
      name: w.displayProperties.name,
      icon: w.displayProperties.icon,
      type: w.itemTypeDisplayName,
      tier: w.inventory?.tierTypeName,
    }));

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Weapons</h1>
      <ItemBrowser items={items} chips={CHIPS} basePath="/weapons" />
    </div>
  );
}
