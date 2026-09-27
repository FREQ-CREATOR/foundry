import { notFound } from "next/navigation";
import { getDestinyItemByHash } from "@/lib/database/queries/items";
import { ItemDetail } from "@/components/ItemDetail";

export default async function ArmorDetailPage({ params }: { params: { hash: string } }) {
  const hash = Number(params.hash);
  const armor = await getDestinyItemByHash(hash);
  if (!armor) notFound();

  return await ItemDetail({ item: armor, backHref: "/armor", backLabel: "Armor" });
}
