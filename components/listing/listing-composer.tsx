"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { listingCategoryOptions, type ListingCategory } from "@/lib/listings/categories";
import { optimizeListingImage, createListingImagePreview, restoreDraftImageFile } from "@/lib/listings/client-images";
import { getPackageDateLabel, isAuctionEndBeforePackageDate, parsePackageDateInput } from "@/lib/listings/date-parser";
import { clearListingDraft, readListingDraft, requestPersistentListingDraftStorage, saveListingDraft } from "@/lib/listings/draft-store";
import type { ListingDraftImageSnapshot, ListingOcrResult, UploadedListingAsset } from "@/lib/listings/draft-types";
import { packageDateKindLabels, packageDateKindValues, requiredListingImageKinds, type PackageDateKind, type RequiredListingImageKind } from "@/lib/listings/shared";

import { PhotoSlotCard } from "./photo-slot-card";

type PublishListingActionState = {
  error?: string;
  listingId?: string;
  success?: boolean;
};

type ListingComposerProps = {
  businessId: string;
  action: (formData: FormData) => Promise<PublishListingActionState>;
};

type ListingComposerFormValues = {
  title: string;
  description: string;
  category: ListingCategory | "";
  customCategory: string;
  reservePrice: string;
  buyoutPrice: string;
  packageDate: string;
  packageDateLabel: string;
  packageDateKind: PackageDateKind;
  ocrRawText: string;
  auctionEndsAtLocal: string;
};

type PhotoSlotStatus = "empty" | "review" | "uploading" | "ready" | "error";

type ListingPhotoSlotState = {
  requestId: number;
  status: PhotoSlotStatus;
  pendingFile?: File;
  pendingPreviewUrl?: string;
  accepted?: ListingDraftImageSnapshot;
  acceptedPreviewUrl?: string;
  error?: string;
};

type ListingPhotosState = Partial<Record<RequiredListingImageKind, ListingPhotoSlotState>>;

const slotCopy: Record<
  RequiredListingImageKind,
  {
    title: string;
    description: string;
  }
> = {
  product: {
    title: "Product photo",
    description: "Lead with the actual item so shoppers can tell what they are bidding on.",
  },
  seal: {
    title: "Seal photo",
    description: "Show the unopened seal clearly so the listing stays within the sealed-goods rule.",
  },
  expiry: {
    title: "Package-date photo",
    description: "Aim tight at the stamped date. OCR will suggest a date, but you stay in control.",
  },
};

function roundToQuarterHour(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const remainder = next.getMinutes() % 15;

  if (remainder !== 0) {
    next.setMinutes(next.getMinutes() + (15 - remainder));
  }

  return next;
}

function toLocalDateTimeValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildSuggestedAuctionEnd(packageDate?: string) {
  const now = new Date();
  const baseline = roundToQuarterHour(new Date(now.getTime() + 2 * 60 * 60 * 1000));

  if (!packageDate) {
    return toLocalDateTimeValue(baseline);
  }

  const parsedPackageDate = parsePackageDateInput(packageDate);

  if (!parsedPackageDate) {
    return toLocalDateTimeValue(baseline);
  }

  const packageDateEvening = new Date(
    parsedPackageDate.year,
    parsedPackageDate.month - 1,
    parsedPackageDate.day,
    21,
    0,
    0,
    0,
  );
  const minimumEnd = roundToQuarterHour(new Date(now.getTime() + 30 * 60 * 1000));
  const suggested = baseline.getTime() > packageDateEvening.getTime()
    ? packageDateEvening
    : baseline;

  if (suggested.getTime() <= minimumEnd.getTime()) {
    return toLocalDateTimeValue(minimumEnd);
  }

  return toLocalDateTimeValue(suggested);
}

function buildDefaultValues(): ListingComposerFormValues {
  return {
    title: "",
    description: "",
    category: "",
    customCategory: "",
    reservePrice: "",
    buyoutPrice: "",
    packageDate: "",
    packageDateLabel: "",
    packageDateKind: "other",
    ocrRawText: "",
    auctionEndsAtLocal: buildSuggestedAuctionEnd(),
  };
}

function centsFromMoneyInput(value: string) {
  const normalized = value.trim().replace(/[$,\s]/g, "");

  if (!normalized) {
    return Number.NaN;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return Math.round(parsed * 100);
}

function isDraftEffectivelyEmpty(
  values: ListingComposerFormValues,
  photos: Partial<Record<RequiredListingImageKind, ListingDraftImageSnapshot>>,
) {
  return (
    values.title.trim().length === 0 &&
    values.description.trim().length === 0 &&
    values.category.trim().length === 0 &&
    values.customCategory.trim().length === 0 &&
    values.reservePrice.trim().length === 0 &&
    values.buyoutPrice.trim().length === 0 &&
    values.packageDate.trim().length === 0 &&
    values.packageDateLabel.trim().length === 0 &&
    values.ocrRawText.trim().length === 0 &&
    Object.keys(photos).length === 0
  );
}

function buildPersistedPhotos(
  photos: ListingPhotosState,
): Partial<Record<RequiredListingImageKind, ListingDraftImageSnapshot>> {
  return Object.fromEntries(
    requiredListingImageKinds.flatMap((kind) => {
      const accepted = photos[kind]?.accepted;
      return accepted ? [[kind, accepted]] : [];
    }),
  ) as Partial<Record<RequiredListingImageKind, ListingDraftImageSnapshot>>;
}

function revokePreviewUrl(url?: string) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

async function uploadListingAsset(
  kind: RequiredListingImageKind,
  file: File,
): Promise<UploadedListingAsset> {
  const formData = new FormData();

  formData.set("kind", kind);
  formData.set("file", file);

  const response = await fetch("/api/listings/uploads", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as {
    asset?: UploadedListingAsset;
    error?: string;
  };

  if (!response.ok || !payload.asset) {
    throw new Error(payload.error || "Upload failed.");
  }

  return payload.asset;
}

async function requestListingOcr(file: File): Promise<ListingOcrResult> {
  const formData = new FormData();

  formData.set("file", file);

  const response = await fetch("/api/listings/ocr", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as ListingOcrResult & {
    error?: string;
  };

  if (!response.ok) {
    return {
      status: "unavailable",
      rawText: "",
      packageDate: "",
      packageDateKind: "other",
      packageDateLabel: "",
      reason: payload.error || "OCR is unavailable right now.",
    };
  }

  return payload;
}

export function ListingComposer({ businessId, action }: ListingComposerProps) {
  const router = useRouter();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<ListingPhotosState>({});
  const [photos, setPhotos] = useState<ListingPhotosState>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [banner, setBanner] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isPublishing, startPublish] = useTransition();
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<ListingComposerFormValues>({
    defaultValues: buildDefaultValues(),
    mode: "onBlur",
  });
  const watchedValues = watch();
  const titleField = register("title", {
    validate: (value) =>
      value.trim().length >= 2 || "Add a product title before publishing.",
  });

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const kind of requiredListingImageKinds) {
        const slot = photosRef.current[kind];
        revokePreviewUrl(slot?.pendingPreviewUrl);
        revokePreviewUrl(slot?.acceptedPreviewUrl);
      }
    };
  }, []);

  const hydrateDraft = useEffectEvent(async () => {
    await requestPersistentListingDraftStorage();

    const draft = await readListingDraft(businessId);

    if (!draft || draft.businessId !== businessId) {
      setIsHydrated(true);
      return;
    }

    reset({
      ...buildDefaultValues(),
      ...draft.values,
      auctionEndsAtLocal:
        draft.values.auctionEndsAtLocal || buildSuggestedAuctionEnd(draft.values.packageDate),
    });

    const restoredPhotos: ListingPhotosState = {};

    for (const kind of requiredListingImageKinds) {
      const accepted = draft.photos[kind];

      if (!accepted) {
        continue;
      }

      restoredPhotos[kind] = {
        requestId: 0,
        status: accepted.asset ? "ready" : "error",
        accepted,
        acceptedPreviewUrl: createListingImagePreview(accepted.blob),
        error: accepted.asset
          ? undefined
          : "Photo restored from draft. Retry upload before publishing.",
      };
    }

    setPhotos(restoredPhotos);
    setBanner(null);
    setIsHydrated(true);
  });

  useEffect(() => {
    void hydrateDraft();
  }, [businessId]);

  const persistDraft = useEffectEvent(async () => {
    const currentValues = getValues();
    const persistedPhotos = buildPersistedPhotos(photosRef.current);

    if (isDraftEffectivelyEmpty(currentValues, persistedPhotos)) {
      await clearListingDraft(businessId);
      return;
    }

    await saveListingDraft(businessId, {
      version: 1,
      businessId,
      updatedAt: new Date().toISOString(),
      values: currentValues,
      photos: persistedPhotos,
    });
  });

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistDraft();
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isHydrated, watchedValues, photos]);

  function replaceSlot(
    kind: RequiredListingImageKind,
    updater: (current: ListingPhotoSlotState | undefined) => ListingPhotoSlotState,
  ) {
    setPhotos((current) => ({
      ...current,
      [kind]: updater(current[kind]),
    }));
  }

  function applyOcrResult(result: ListingOcrResult) {
    setValue("ocrRawText", result.rawText, { shouldDirty: true });

    if (result.status !== "succeeded") {
      return;
    }

    setValue("packageDate", result.packageDate, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("packageDateKind", result.packageDateKind, { shouldDirty: true });
    setValue("packageDateLabel", result.packageDateLabel, { shouldDirty: true });

    const auctionEndsAtLocal = getValues("auctionEndsAtLocal");

    if (
      !auctionEndsAtLocal ||
      !isAuctionEndBeforePackageDate(
        new Date(auctionEndsAtLocal).toISOString(),
        result.packageDate,
      )
    ) {
      setValue("auctionEndsAtLocal", buildSuggestedAuctionEnd(result.packageDate), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  function selectFile(kind: RequiredListingImageKind, file: File) {
    const previewUrl = createListingImagePreview(file);

    setBanner(null);

    replaceSlot(kind, (current) => {
      revokePreviewUrl(current?.pendingPreviewUrl);

      return {
        requestId: (current?.requestId ?? 0) + 1,
        status: "review",
        pendingFile: file,
        pendingPreviewUrl: previewUrl,
        accepted: current?.accepted,
        acceptedPreviewUrl: current?.acceptedPreviewUrl,
      };
    });
  }

  async function uploadAcceptedSlot(
    kind: RequiredListingImageKind,
    requestId: number,
    accepted: ListingDraftImageSnapshot,
  ) {
    try {
      const restoredFile = restoreDraftImageFile(accepted);
      const asset = await uploadListingAsset(kind, restoredFile);
      const ocr = kind === "expiry" ? await requestListingOcr(restoredFile) : accepted.ocr;

      if (ocr) {
        applyOcrResult(ocr);
      }

      replaceSlot(kind, (current) => {
        if (!current || current.requestId !== requestId || !current.accepted) {
          return current ?? {
            requestId,
            status: "empty",
          };
        }

        return {
          ...current,
          status: "ready",
          accepted: {
            ...current.accepted,
            asset,
            ocr,
          },
          error: undefined,
        };
      });
    } catch (error) {
      replaceSlot(kind, (current) => {
        if (!current || current.requestId !== requestId) {
          return current ?? {
            requestId,
            status: "empty",
          };
        }

        return {
          ...current,
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "The photo could not finish uploading.",
        };
      });
    }
  }

  async function acceptPhoto(kind: RequiredListingImageKind) {
    const currentSlot = photosRef.current[kind];

    if (!currentSlot?.pendingFile) {
      return;
    }

    const requestId = currentSlot.requestId + 1;

    replaceSlot(kind, (slot) => ({
      requestId,
      status: "uploading",
      pendingFile: slot?.pendingFile,
      pendingPreviewUrl: slot?.pendingPreviewUrl,
      accepted: slot?.accepted,
      acceptedPreviewUrl: slot?.acceptedPreviewUrl,
      error: undefined,
    }));

    try {
      const optimizedFile = await optimizeListingImage(currentSlot.pendingFile, kind);
      const acceptedPreviewUrl = createListingImagePreview(optimizedFile);
      const accepted: ListingDraftImageSnapshot = {
        kind,
        blob: optimizedFile,
        name: optimizedFile.name,
        type: optimizedFile.type,
        lastModified: optimizedFile.lastModified,
      };

      replaceSlot(kind, (slot) => {
        if (!slot || slot.requestId !== requestId) {
          revokePreviewUrl(acceptedPreviewUrl);
          return slot ?? {
            requestId,
            status: "empty",
          };
        }

        revokePreviewUrl(slot.pendingPreviewUrl);
        revokePreviewUrl(slot.acceptedPreviewUrl);

        return {
          requestId,
          status: "uploading",
          accepted,
          acceptedPreviewUrl,
        };
      });

      await uploadAcceptedSlot(kind, requestId, accepted);
    } catch (error) {
      replaceSlot(kind, (slot) => {
        if (!slot || slot.requestId !== requestId) {
          return slot ?? {
            requestId,
            status: "empty",
          };
        }

        return {
          ...slot,
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "This photo could not be prepared for upload.",
        };
      });
    }
  }

  async function retryUpload(kind: RequiredListingImageKind) {
    const currentSlot = photosRef.current[kind];

    if (!currentSlot?.accepted) {
      return;
    }

    const requestId = currentSlot.requestId + 1;

    replaceSlot(kind, (slot) => ({
      requestId,
      status: "uploading",
      accepted: slot?.accepted,
      acceptedPreviewUrl: slot?.acceptedPreviewUrl,
      error: undefined,
    }));

    await uploadAcceptedSlot(kind, requestId, currentSlot.accepted);
  }

  function validatePhotos() {
    let hasPhotoError = false;

    for (const kind of requiredListingImageKinds) {
      const currentSlot = photosRef.current[kind];

      if (!currentSlot) {
        continue;
      }

      if (currentSlot.pendingFile) {
        hasPhotoError = true;
        replaceSlot(kind, (slot) => ({
          ...(slot ?? {
            requestId: 0,
            status: "review",
          }),
          error: "Accept the new photo before publishing.",
        }));
        continue;
      }

      if (currentSlot.status === "uploading" || (currentSlot.accepted && !currentSlot.accepted.asset)) {
        hasPhotoError = true;
        replaceSlot(kind, (slot) => ({
          ...(slot ?? {
            requestId: 0,
            status: "error",
          }),
          status: "error",
          error: "Wait for the upload to finish or retry it before publishing.",
        }));
      }
    }

    return !hasPhotoError;
  }

  const submit = handleSubmit((values) => {
    clearErrors();
    setBanner(null);

    let hasClientError = false;
    const reservePriceCents = centsFromMoneyInput(values.reservePrice);
    const buyoutPriceCents = centsFromMoneyInput(values.buyoutPrice);

    if (!values.category) {
      hasClientError = true;
      setError("category", {
        type: "manual",
        message: "Choose a category.",
      });
    }

    if (values.category === "other" && values.customCategory.trim().length < 2) {
      hasClientError = true;
      setError("customCategory", {
        type: "manual",
        message: "Add the custom category name.",
      });
    }

    if (!Number.isFinite(reservePriceCents) || reservePriceCents <= 0) {
      hasClientError = true;
      setError("reservePrice", {
        type: "manual",
        message: "Add a reserve price.",
      });
    }

    if (!Number.isFinite(buyoutPriceCents) || buyoutPriceCents <= 0) {
      hasClientError = true;
      setError("buyoutPrice", {
        type: "manual",
        message: "Add a buyout price.",
      });
    } else if (
      Number.isFinite(reservePriceCents) &&
      buyoutPriceCents <= reservePriceCents
    ) {
      hasClientError = true;
      setError("buyoutPrice", {
        type: "manual",
        message: "Buyout has to be higher than the reserve price.",
      });
    }

    if (!parsePackageDateInput(values.packageDate)) {
      hasClientError = true;
      setError("packageDate", {
        type: "manual",
        message: "Confirm the package date.",
      });
    }

    const auctionDate = new Date(values.auctionEndsAtLocal);

    if (Number.isNaN(auctionDate.getTime())) {
      hasClientError = true;
      setError("auctionEndsAtLocal", {
        type: "manual",
        message: "Choose a valid auction end time.",
      });
    } else if (
      parsePackageDateInput(values.packageDate) &&
      !isAuctionEndBeforePackageDate(auctionDate.toISOString(), values.packageDate)
    ) {
      hasClientError = true;
      setError("auctionEndsAtLocal", {
        type: "manual",
        message: "Auction end time must land before the confirmed package date.",
      });
    }

    if (!validatePhotos()) {
      hasClientError = true;
    }

    if (hasClientError) {
      return;
    }

    const images = requiredListingImageKinds
      .map((kind) => photosRef.current[kind]?.accepted?.asset)
      .filter((image): image is NonNullable<typeof image> => Boolean(image));

    const formData = new FormData();
    const selectedCategory = values.category;

    formData.set("title", values.title.trim());
    formData.set("description", values.description.trim());
    formData.set("category", selectedCategory);
    formData.set("customCategory", values.customCategory.trim());
    formData.set("reservePrice", values.reservePrice.trim());
    formData.set("buyoutPrice", values.buyoutPrice.trim());
    formData.set("packageDate", values.packageDate);
    formData.set("packageDateLabel", values.packageDateLabel.trim());
    formData.set("packageDateKind", values.packageDateKind);
    formData.set("ocrRawText", values.ocrRawText);
    formData.set("auctionEndsAtIso", new Date(values.auctionEndsAtLocal).toISOString());
    formData.set("images", JSON.stringify(images));

    startPublish(async () => {
      const result = await action(formData);

      if (result?.error) {
        setBanner({
          tone: "error",
          message: result.error,
        });
        return;
      }

      await clearListingDraft(businessId);

      setPhotos((current) => {
        for (const kind of requiredListingImageKinds) {
          revokePreviewUrl(current[kind]?.pendingPreviewUrl);
          revokePreviewUrl(current[kind]?.acceptedPreviewUrl);
        }

        return {};
      });

      reset(buildDefaultValues());
      setBanner({
        tone: "success",
        message: "Listed. The desk is reset and ready for another item.",
      });
      router.refresh();
      titleInputRef.current?.focus();
    });
  });

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="rounded-[1.9rem] border border-[#d9cab9] bg-[#fff8ef] px-4 py-4 text-sm leading-7 text-[#5b4a3a]">
        Photos are optional while we test — fill in the form below and publish. A
        placeholder image will show on the buyer feed when no photo is attached.
      </div>

      {banner ? (
        <div
          className={`rounded-[1.7rem] border px-4 py-4 text-sm leading-7 ${
            banner.tone === "success"
              ? "border-[#c5dfce] bg-[#eef8f2] text-[#214a37]"
              : "border-[#ebd0c8] bg-[#fff1ed] text-[#8b3b2f]"
          }`}
        >
          {banner.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <PhotoSlotCard
          description={slotCopy.product.description}
          error={photos.product?.error}
          hasAcceptedPhoto={Boolean(photos.product?.accepted)}
          kind="product"
          onAccept={() => void acceptPhoto("product")}
          onRetryUpload={() => void retryUpload("product")}
          onSelectFile={(file) => selectFile("product", file)}
          previewUrl={photos.product?.pendingPreviewUrl ?? photos.product?.acceptedPreviewUrl}
          status={photos.product?.status ?? "empty"}
          title={slotCopy.product.title}
        />
        <PhotoSlotCard
          description={slotCopy.seal.description}
          error={photos.seal?.error}
          hasAcceptedPhoto={Boolean(photos.seal?.accepted)}
          kind="seal"
          onAccept={() => void acceptPhoto("seal")}
          onRetryUpload={() => void retryUpload("seal")}
          onSelectFile={(file) => selectFile("seal", file)}
          previewUrl={photos.seal?.pendingPreviewUrl ?? photos.seal?.acceptedPreviewUrl}
          status={photos.seal?.status ?? "empty"}
          title={slotCopy.seal.title}
        />
        <div className="sm:col-span-2">
          <PhotoSlotCard
            description={slotCopy.expiry.description}
            error={photos.expiry?.error}
            hasAcceptedPhoto={Boolean(photos.expiry?.accepted)}
            kind="expiry"
            ocr={photos.expiry?.accepted?.ocr}
            onAccept={() => void acceptPhoto("expiry")}
            onRetryUpload={() => void retryUpload("expiry")}
            onSelectFile={(file) => selectFile("expiry", file)}
            previewUrl={photos.expiry?.pendingPreviewUrl ?? photos.expiry?.acceptedPreviewUrl}
            status={photos.expiry?.status ?? "empty"}
            title={slotCopy.expiry.title}
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-[2rem] border border-[#d8ccb9] bg-white/88 p-4 shadow-[0_18px_60px_rgba(54,38,25,0.05)]">
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2d2419]">Product title</span>
            <input
              {...titleField}
              className="rounded-[1.2rem] border border-[#dccfbd] bg-[#fff8ef] px-4 py-3 text-sm text-[#2d2419] outline-none transition focus:border-[#d98c55]"
              placeholder="Greek yogurt four-pack"
              ref={(node) => {
                titleField.ref(node);
                titleInputRef.current = node;
              }}
            />
          </label>
          {errors.title ? (
            <p className="text-sm text-[#a03d30]">{errors.title.message}</p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2d2419]">Category</span>
            <select
              {...register("category", {
                onChange: (event) => {
                  if (event.target.value !== "other") {
                    setValue("customCategory", "", { shouldDirty: true });
                    clearErrors("customCategory");
                  }
                },
              })}
              className="rounded-[1.2rem] border border-[#dccfbd] bg-[#fff8ef] px-4 py-3 text-sm text-[#2d2419] outline-none transition focus:border-[#d98c55]"
            >
              <option value="">Choose a category</option>
              {listingCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2d2419]">
              Custom category
            </span>
            <input
              {...register("customCategory")}
              className="rounded-[1.2rem] border border-[#dccfbd] bg-[#fff8ef] px-4 py-3 text-sm text-[#2d2419] outline-none transition focus:border-[#d98c55]"
              placeholder="Only if other"
            />
          </label>
        </div>
        {errors.category ? (
          <p className="text-sm text-[#a03d30]">{errors.category.message}</p>
        ) : null}
        {errors.customCategory ? (
          <p className="text-sm text-[#a03d30]">{errors.customCategory.message}</p>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[#2d2419]">Notes</span>
          <textarea
            {...register("description")}
            className="min-h-28 rounded-[1.2rem] border border-[#dccfbd] bg-[#fff8ef] px-4 py-3 text-sm text-[#2d2419] outline-none transition focus:border-[#d98c55]"
            placeholder="Multipack still sealed. Keep refrigerated."
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2d2419]">Reserve price</span>
            <input
              {...register("reservePrice")}
              className="rounded-[1.2rem] border border-[#dccfbd] bg-[#fff8ef] px-4 py-3 text-sm text-[#2d2419] outline-none transition focus:border-[#d98c55]"
              inputMode="decimal"
              placeholder="4.00"
            />
            {errors.reservePrice ? (
              <p className="text-sm text-[#a03d30]">{errors.reservePrice.message}</p>
            ) : null}
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2d2419]">Buyout price</span>
            <input
              {...register("buyoutPrice")}
              className="rounded-[1.2rem] border border-[#dccfbd] bg-[#fff8ef] px-4 py-3 text-sm text-[#2d2419] outline-none transition focus:border-[#d98c55]"
              inputMode="decimal"
              placeholder="6.50"
            />
            {errors.buyoutPrice ? (
              <p className="text-sm text-[#a03d30]">{errors.buyoutPrice.message}</p>
            ) : null}
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2d2419]">Package date</span>
            <input
              {...register("packageDate")}
              className="rounded-[1.2rem] border border-[#dccfbd] bg-[#fff8ef] px-4 py-3 text-sm text-[#2d2419] outline-none transition focus:border-[#d98c55]"
              type="date"
            />
            {errors.packageDate ? (
              <p className="text-sm text-[#a03d30]">{errors.packageDate.message}</p>
            ) : null}
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2d2419]">Auction ends</span>
            <input
              {...register("auctionEndsAtLocal")}
              className="rounded-[1.2rem] border border-[#dccfbd] bg-[#fff8ef] px-4 py-3 text-sm text-[#2d2419] outline-none transition focus:border-[#d98c55]"
              type="datetime-local"
            />
            {errors.auctionEndsAtLocal ? (
              <p className="text-sm text-[#a03d30]">
                {errors.auctionEndsAtLocal.message}
              </p>
            ) : null}
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2d2419]">Date label type</span>
            <select
              {...register("packageDateKind", {
                onChange: (event) => {
                  const nextKind = event.target.value as PackageDateKind;
                  const nextLabel = getPackageDateLabel(nextKind);
                  const currentLabel = getValues("packageDateLabel").trim();
                  const currentKind = getValues("packageDateKind");
                  const currentDefault = getPackageDateLabel(currentKind);

                  if (!currentLabel || currentLabel === currentDefault) {
                    setValue("packageDateLabel", nextKind === "other" ? "" : nextLabel, {
                      shouldDirty: true,
                    });
                  }
                },
              })}
              className="rounded-[1.2rem] border border-[#dccfbd] bg-[#fff8ef] px-4 py-3 text-sm text-[#2d2419] outline-none transition focus:border-[#d98c55]"
            >
              {packageDateKindValues.map((kind) => (
                <option key={kind} value={kind}>
                  {packageDateKindLabels[kind]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2d2419]">Printed label text</span>
            <input
              {...register("packageDateLabel")}
              className="rounded-[1.2rem] border border-[#dccfbd] bg-[#fff8ef] px-4 py-3 text-sm text-[#2d2419] outline-none transition focus:border-[#d98c55]"
              placeholder="Best by"
            />
          </label>
        </div>

        <input type="hidden" {...register("ocrRawText")} />

        <div className="rounded-[1.5rem] border border-[#e5d3bd] bg-[#fff8ef] px-4 py-4 text-sm leading-7 text-[#665240]">
          Drafts auto-save in this browser with accepted photo blobs, so a seller can
          leave mid-listing and come back without losing the desk state.
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-[#5f4b38]">
          All three accepted photos must finish uploading before publish unlocks.
        </p>
        <button
          className="inline-flex items-center justify-center rounded-full bg-[#f05f38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d95632] disabled:cursor-not-allowed disabled:bg-[#efb19e]"
          disabled={!isHydrated || isPublishing}
          type="submit"
        >
          {isPublishing ? "Publishing..." : "Publish listing"}
        </button>
      </div>
    </form>
  );
}
