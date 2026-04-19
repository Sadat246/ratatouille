"use client";

import type { SortBy } from "@/lib/auctions/queries";
import { listingCategoryLabels, listingCategoryValues } from "@/lib/listings/categories";

type FilterChipRowProps = {
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
};

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "ending_soon", label: "Ending soon" },
  { value: "nearest", label: "Nearest first" },
  { value: "lowest_price", label: "Lowest price" },
];

const CHIP_INACTIVE =
  "inline-flex items-center whitespace-nowrap rounded-full border border-[#edd6be] bg-[rgba(255,248,239,0.88)] px-3.5 py-2 text-xs font-semibold text-[#705446] transition-colors min-h-[44px]";
const CHIP_ACTIVE =
  "inline-flex items-center whitespace-nowrap rounded-full border border-[#3d8d5c] bg-[#3d8d5c] px-3.5 py-2 text-xs font-semibold text-white transition-colors min-h-[44px]";

export function FilterChipRow({
  sortBy,
  onSortChange,
  selectedCategories,
  onCategoryChange,
}: FilterChipRowProps) {
  function handleCategoryToggle(category: string) {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter((c) => c !== category));
    } else {
      onCategoryChange([...selectedCategories, category]);
    }
  }

  function handleAllCategories() {
    onCategoryChange([]);
  }

  const allActive = selectedCategories.length === 0;

  return (
    <div
      className="rounded-[1.6rem] border border-white/60 bg-[rgba(255,248,239,0.6)] px-4 py-3 backdrop-blur"
      role="toolbar"
      aria-label="Filter and sort"
    >
      <div className="flex flex-wrap gap-2">
        {/* Sort chips */}
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={sortBy === option.value}
            onClick={() => onSortChange(option.value)}
            className={sortBy === option.value ? CHIP_ACTIVE : CHIP_INACTIVE}
          >
            {option.label}
          </button>
        ))}

        {/* Divider */}
        <div className="mx-1 h-5 w-px flex-shrink-0 self-center bg-[#dfc9b6]" />

        {/* All chip */}
        <button
          type="button"
          aria-pressed={allActive}
          onClick={handleAllCategories}
          className={allActive ? CHIP_ACTIVE : CHIP_INACTIVE}
        >
          All
        </button>

        {/* Category chips */}
        {listingCategoryValues.map((cat) => {
          const active = selectedCategories.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={active}
              onClick={() => handleCategoryToggle(cat)}
              className={active ? CHIP_ACTIVE : CHIP_INACTIVE}
            >
              {listingCategoryLabels[cat]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
