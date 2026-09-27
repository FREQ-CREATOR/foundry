export type ItemSummary = {
  hash: number;
  name: string;
  icon: string;
  type: string;
  tier?: string;
  classType?: number;
  perkGroup?: string;
  description?: string;
};

export type Chip = {
  key: string;
  label: string;
};
