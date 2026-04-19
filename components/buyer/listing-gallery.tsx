"use client";

/* eslint-disable @next/next/no-img-element */

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

type ListingGalleryProps = {
  images: string[];
};

export function ListingGallery({ images }: ListingGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-[#ececec] bg-[linear-gradient(140deg,#f3fbf5_0%,#cbe8d8_48%,#7ab89a_100%)]">
        <svg
          aria-hidden="true"
          viewBox="0 0 64 64"
          className="h-20 w-20 text-white/70"
          fill="currentColor"
        >
          <path d="M10 54C10 30 30 10 54 10c0 28-20 44-44 44z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-[#ececec] bg-white" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {images.map((url, i) => (
            <div key={url} className="min-w-0 flex-[0_0_100%]">
              <img
                src={url}
                alt={`Photo ${i + 1} of ${images.length}`}
                className="aspect-square w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 ? (
        <div
          role="tablist"
          aria-label="Photo navigation"
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              role="tab"
              aria-label={`Photo ${i + 1} of ${images.length}`}
              aria-selected={i === selectedIndex}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-20 sm:w-20 ${
                i === selectedIndex
                  ? "border-[#3d8d5c]"
                  : "border-[#ececec] hover:border-[#cfcfcf]"
              }`}
            >
              <img
                src={url}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
