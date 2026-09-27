import { notFound } from "next/navigation";
import { getDestinyItemByHash } from "@/lib/database/queries/items";
import { getWeaponCalculatorData } from "@/lib/database/queries/calculator";
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
      />
    ) : null;

  return await ItemDetail({
    item: weapon,
    backHref: "/weapons",
    backLabel: "Weapons",
    calculator,
  });
}
