"use client";

import type { ListingCategory } from "@/lib/listings/categories";

type CategoryStripProps = {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
};

type CategoryDef = {
  key: ListingCategory | "all";
  label: string;
  render: () => React.ReactNode;
};

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const categories: CategoryDef[] = [
  {
    key: "dairy",
    label: "Dairy",
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
        <path {...stroke} d="M14 10h12v4l2 4v18H12V18l2-4Z" />
        <path {...stroke} d="M14 14h12" />
      </svg>
    ),
  },
  {
    key: "bakery",
    label: "Bakery",
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
        <path {...stroke} d="M8 26c0-6 5-12 12-12s12 6 12 12v2H8Z" />
        <path {...stroke} d="M12 22c1-1.5 3-2 4-1M22 20c1-1.5 3-2 5-1" />
      </svg>
    ),
  },
  {
    key: "produce",
    label: "Produce",
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
        <path {...stroke} d="M20 12c6 0 10 4 10 10s-4 10-10 10-10-4-10-10 4-10 10-10Z" />
        <path {...stroke} d="M20 12c-1-3-3-4-5-4 1 2 3 4 5 4Z" />
      </svg>
    ),
  },
  {
    key: "meat",
    label: "Meat",
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
        <path {...stroke} d="M12 14c2-4 6-6 10-6 6 0 10 4 10 8 0 3-2 5-4 6-1 1-1 2-1 3v3c0 2-2 4-5 4H14c-3 0-5-2-5-5 0-2 1-3 2-4-1-2 0-4 1-5Z" />
        <circle cx="17" cy="22" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: "pantry",
    label: "Pantry",
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
        <path {...stroke} d="M10 10h20v8H10Zm0 8h20v14H10Z" />
        <path {...stroke} d="M16 22v6m8-6v6" />
      </svg>
    ),
  },
  {
    key: "frozen",
    label: "Frozen",
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
        <path {...stroke} d="M20 6v28M8 12l24 16M8 28l24-16M20 10l-4 4m4-4 4 4M20 30l-4-4m4 4 4-4" />
      </svg>
    ),
  },
  {
    key: "beverages",
    label: "Drinks",
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
        <path {...stroke} d="M14 8h12l-1.5 24c0 1.5-1.5 2-2.5 2h-4c-1 0-2.5-.5-2.5-2Z" />
        <path {...stroke} d="M14.5 14h11" />
      </svg>
    ),
  },
  {
    key: "snacks",
    label: "Snacks",
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
        <path {...stroke} d="M12 10h16l-2 22H14Z" />
        <path {...stroke} d="M16 16h8m-8 6h8" />
      </svg>
    ),
  },
  {
    key: "household",
    label: "Household",
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
        <path {...stroke} d="M8 20 20 10l12 10v12H8Z" />
        <path {...stroke} d="M17 32v-6h6v6" />
      </svg>
    ),
  },
  {
    key: "all",
    label: "All",
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
        <rect {...stroke} x="10" y="10" width="8" height="8" rx="1.5" />
        <rect {...stroke} x="22" y="10" width="8" height="8" rx="1.5" />
        <rect {...stroke} x="10" y="22" width="8" height="8" rx="1.5" />
        <rect {...stroke} x="22" y="22" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
];

export function CategoryStrip({
  selectedCategories,
  onCategoryChange,
}: CategoryStripProps) {
  function handleClick(key: CategoryDef["key"]) {
    if (key === "all") {
      onCategoryChange([]);
      return;
    }
    if (selectedCategories.includes(key)) {
      onCategoryChange(selectedCategories.filter((c) => c !== key));
    } else {
      onCategoryChange([...selectedCategories, key]);
    }
  }

  return (
    <section
      id="shop-categories"
      className="rounded-2xl border border-[#ececec] bg-white px-6 py-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-6 sm:justify-around">
        {categories.map((cat) => {
          const active =
            cat.key === "all"
              ? selectedCategories.length === 0
              : selectedCategories.includes(cat.key);
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => handleClick(cat.key)}
              aria-pressed={active}
              className="group flex min-w-[68px] flex-col items-center gap-2 outline-none"
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
                  active
                    ? "bg-[#3d8d5c] text-white shadow-[0_10px_24px_rgba(61,141,92,0.3)]"
                    : "bg-[#f5f5f5] text-[#4a4a4a] group-hover:bg-[#ececec]"
                }`}
              >
                {cat.render()}
              </span>
              <span
                className={`text-xs font-medium transition-colors ${
                  active ? "text-[#1a1a1a]" : "text-[#4a4a4a] group-hover:text-[#1a1a1a]"
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
