import { notFound } from "next/navigation";
import { getDestinyItemByHash } from "@/lib/database/queries/items";
import { ItemDetail } from "@/components/ItemDetail";

export default async function WeaponDetailPage({ params }: { params: { hash: string } }) {
  const hash = Number(params.hash);
  const weapon = await getDestinyItemByHash(hash);
  if (!weapon) notFound();

  return await ItemDetail({ item: weapon, backHref: "/weapons", backLabel: "Weapons" });
}
