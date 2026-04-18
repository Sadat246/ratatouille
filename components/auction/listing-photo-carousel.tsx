"use client";

/* eslint-disable @next/next/no-img-element */

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

type ListingPhotoCarouselProps = {
  images: string[];
};

export function ListingPhotoCarousel({ images }: ListingPhotoCarouselProps) {
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
      <div className="aspect-[4/3] w-full rounded-[2rem] bg-[linear-gradient(140deg,#fff5eb_0%,#ffe1c0_48%,#ffb87c_100%)]" />
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-[2rem]" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {images.map((url, i) => (
            <div key={url} className="min-w-0 flex-[0_0_100%]">
              <img
                src={url}
                alt={`Photo ${i + 1} of ${images.length}`}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div
          role="tablist"
          aria-label="Photo navigation"
          className="mt-2 flex justify-center gap-1.5"
        >
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              role="tab"
              aria-label={`Photo ${i + 1} of ${images.length}`}
              aria-selected={i === selectedIndex}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === selectedIndex ? "bg-[#f75d36]" : "bg-[#dfc9b6]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
