import { notFound } from "next/navigation";
import { getDestinyItemByHash } from "@/lib/database/queries/items";
import { getWeaponCalculatorData } from "@/lib/database/queries/calculator";
import { getManifestDefinitions } from "@/lib/database/queries/manifest";
import { ItemDetail } from "@/components/ItemDetail";
import { DamageCalculator } from "@/components/DamageCalculator";

export default async function WeaponDetailPage({ params }: { params: { hash: string } }) {
  const hash = Number(params.hash);
  const weapon = await getDestinyItemByHash(hash);
  if (!weapon) notFound();

  const calculatorData = await getWeaponCalculatorData(weapon);

  const stats: Record<number, number> = {};
  for (const [statHash, stat] of Object.entries(weapon.stats?.stats ?? {})) {
    stats[Number(statHash)] = (stat as any).value;
  }

  const statHashes = Object.keys(stats).map(Number);
  const statDefs = await getManifestDefinitions("DestinyStatDefinition", statHashes);
  const statsDisplay = Object.entries(stats)
    .filter(([h]) => statDefs[Number(h)]?.displayProperties?.name)
    .map(([h, value]) => ({
      hash: Number(h),
      name: statDefs[Number(h)].displayProperties.name,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  const calculator =
    calculatorData.intrinsicHash != null ? (
      <DamageCalculator
        weapon={{
          hash: weapon.hash,
          weaponTypeId: weapon.itemSubType,
          ammoTypeId: weapon.equippingBlock?.ammoType ?? 0,
          damageTypeId: weapon.defaultDamageTypeHash ?? 0,
          stats,
        }}
        data={calculatorData}
        stats={statsDisplay}
      />
    ) : null;

  return await ItemDetail({
    item: weapon,
    backHref: "/weapons",
    backLabel: "Weapons",
    calculator,
  });
}
