export const listingCategoryValues = [
  "dairy",
  "bakery",
  "produce",
  "meat",
  "pantry",
  "frozen",
  "beverages",
  "snacks",
  "household",
  "other",
] as const;

export type ListingCategory = (typeof listingCategoryValues)[number];

export const listingCategoryLabels: Record<ListingCategory, string> = {
  dairy: "Dairy",
  bakery: "Bakery",
  produce: "Produce",
  meat: "Meat",
  pantry: "Pantry",
  frozen: "Frozen",
  beverages: "Beverages",
  snacks: "Snacks",
  household: "Household",
  other: "Other",
};

export const listingCategoryOptions = listingCategoryValues.map((value) => ({
  value,
  label: listingCategoryLabels[value],
}));
