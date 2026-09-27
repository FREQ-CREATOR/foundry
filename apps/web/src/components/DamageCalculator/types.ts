export type WeaponCalcSummary = {
  hash: number;
  weaponTypeId: number;
  ammoTypeId: number;
  damageTypeId: number;
  stats: Record<number, number>;
};

export type PerkOption = {
  hash: number;
  name: string;
  icon: string;
  description: string;
  investmentStats: { statTypeHash: number; value: number }[];
};

export type PerkColumn = {
  socketIndex: number;
  categoryName: string;
  defaultHash: number;
  options: PerkOption[];
};

export type CalculatorData = {
  intrinsicHash: number | null;
  columns: PerkColumn[];
};
