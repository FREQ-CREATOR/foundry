export type PerkGroup = "weaponPerk" | "intrinsic" | "origin" | "weaponMod" | "armorMod";

const WEAPON_PERK_IDS = new Set([
  "scopes",
  "barrels",
  "magazines",
  "magazines_gl",
  "batteries",
  "ammo_perk",
  "build_perk",
  "catalysts",
]);

export function classifyPlugCategory(plugCategoryIdentifier: string): PerkGroup | null {
  const id = plugCategoryIdentifier;
  if (id === "origins") return "origin";
  if (id === "intrinsics" || id === "frames") return "intrinsic";
  if (
    id.startsWith("enhancements.v2_") ||
    id === "armor_stats" ||
    id.includes("masterworks.stat") ||
    id.includes("plugs.armor.masterworks") ||
    id.includes("masterworks.generic.armor")
  ) {
    return "armorMod";
  }
  if (id.startsWith("v400.weapon.mod") || id.includes("masterworks.generic.weapons")) {
    return "weaponMod";
  }
  if (WEAPON_PERK_IDS.has(id)) return "weaponPerk";
  return null;
}

export const PERK_GROUP_LABEL: Record<PerkGroup, string> = {
  weaponPerk: "Weapon Perks",
  intrinsic: "Intrinsic Traits",
  origin: "Origin Traits",
  weaponMod: "Weapon Mods",
  armorMod: "Armor Mods",
};
