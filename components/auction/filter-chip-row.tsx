"use client";

import type { SortBy } from "@/lib/auctions/queries";
import { listingCategoryLabels, listingCategoryValues } from "@/lib/listings/categories";

type FilterChipRowProps = {
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  layout?: "mobile" | "desktop-rail";
};

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "ending_soon", label: "Ending soon" },
  { value: "nearest", label: "Nearest first" },
  { value: "lowest_price", label: "Lowest price" },
];

const CHIP_INACTIVE =
  "inline-flex items-center whitespace-nowrap rounded-full border border-[#edd6be] bg-[rgba(255,248,239,0.88)] px-3.5 py-2 text-xs font-semibold text-[#705446] transition-colors min-h-[44px]";
const CHIP_ACTIVE =
  "inline-flex items-center whitespace-nowrap rounded-full border border-[#f75d36] bg-[#f75d36] px-3.5 py-2 text-xs font-semibold text-white transition-colors min-h-[44px]";

export function FilterChipRow({
  sortBy,
  onSortChange,
  selectedCategories,
  onCategoryChange,
  layout = "mobile",
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

  if (layout === "desktop-rail") {
    return (
      <section className="rounded-[2rem] border border-[#eed9ca] bg-[rgba(255,248,239,0.9)] p-5 shadow-[0_22px_70px_rgba(70,40,24,0.08)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#a05a38]">
          Browse filters
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#261710]">
          Narrow the lot board
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6d5244]">
          Keep the live grid in view while you cut by category.
        </p>

        <div className="mt-5 border-t border-[#ecd8c8] pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#8f634c]">
              Categories
            </p>
            {!allActive ? (
              <button
                type="button"
                onClick={handleAllCategories}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a45631]"
              >
                Reset
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={allActive}
              onClick={handleAllCategories}
              className={allActive ? CHIP_ACTIVE : CHIP_INACTIVE}
            >
              All
            </button>

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

        <div className="mt-5 rounded-[1.5rem] border border-[#ecd8c8] bg-[rgba(255,252,248,0.72)] px-4 py-3 text-sm leading-6 text-[#6e5446]">
          {sortBy === "ending_soon"
            ? "Sorted by the auctions that are about to close."
            : sortBy === "nearest"
              ? "Sorted by the stores closest to the shopper."
              : "Sorted by the lowest current prices first."}
        </div>
      </section>
    );
  }

  return (
    <div
      className="sticky top-0 z-20 -mx-4 border-b border-white/40 bg-[rgba(245,232,213,0.85)] px-4 py-2 backdrop-blur-md lg:hidden"
      role="toolbar"
      aria-label="Filter and sort"
    >
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
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
