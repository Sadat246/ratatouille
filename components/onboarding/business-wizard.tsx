"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import type { BusinessOnboardingInput } from "@/lib/validation/onboarding";

import { ProgressSteps } from "./progress-steps";

type BusinessWizardProps = {
  defaultContactEmail: string;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
};

const steps = [
  "Name the storefront",
  "Confirm the pickup address",
  "Add handoff details",
];

export function BusinessWizard({
  defaultContactEmail,
  action,
}: BusinessWizardProps) {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<BusinessOnboardingInput>({
    defaultValues: {
      contactEmail: defaultContactEmail,
      addressLine2: "",
      countryCode: "US",
    },
  });
  const [step, setStep] = useState(1);
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "captured" | "error"
  >("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function nextStep() {
    const values = getValues();

    if (step === 1 && values.storeName.trim().length < 2) {
      setError("storeName", {
        message: "Add the store name.",
      });
      return;
    }

    if (step === 2) {
      if (
        values.addressLine1.trim().length < 3 ||
        values.city.trim().length < 2 ||
        values.state.trim().length < 2 ||
        values.postalCode.trim().length < 5
      ) {
        setError("addressLine1", {
          message: "Complete the storefront address before moving on.",
        });
        return;
      }
    }

    clearErrors();
    setStep((current) => Math.min(current + 1, steps.length));
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 1));
  }

  function captureStorefrontLocation() {
    if (!navigator.geolocation) {
      setLocationState("error");
      setServerError("This browser does not support geolocation.");
      return;
    }

    setLocationState("loading");
    setServerError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue("browserLatitude", position.coords.latitude, {
          shouldDirty: true,
        });
        setValue("browserLongitude", position.coords.longitude, {
          shouldDirty: true,
        });
        setLocationState("captured");
      },
      () => {
        setLocationState("error");
        setServerError(
          "Allow location access if you want a storefront-coordinate fallback.",
        );
      },
      {
        enableHighAccuracy: true,
      },
    );
  }

  const submit = handleSubmit((values) => {
    setServerError(null);
    const formData = new FormData();

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === null) {
        continue;
      }

      formData.set(key, String(value));
    }

    startTransition(async () => {
      const result = await action(formData);

      if (result?.error) {
        setServerError(result.error);
      }
    });
  });

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-[2.2rem] border border-white/70 bg-white/82 p-5 shadow-[0_24px_90px_rgba(43,48,36,0.1)] backdrop-blur"
    >
      <ProgressSteps currentStep={step} steps={steps} />

      <input type="hidden" {...register("browserLatitude", { valueAsNumber: true })} />
      <input type="hidden" {...register("browserLongitude", { valueAsNumber: true })} />

      {step === 1 ? (
        <section className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#173126]">
              Store name
            </span>
            <input
              {...register("storeName")}
              className="rounded-[1.1rem] border border-[#cadccf] bg-[#f4faf6] px-4 py-3 text-sm text-[#173126] outline-none transition focus:border-[#5d9c7f]"
              placeholder="Bright Basket"
            />
          </label>
          <p className="rounded-[1.4rem] bg-[#eef7f1] px-4 py-3 text-sm leading-7 text-[#315343]">
            This becomes the seller identity shoppers see on listings, feed
            cards, and pickup handoffs later.
          </p>
          {errors.storeName ? (
            <p className="text-sm text-[#b13f2f]">{errors.storeName.message}</p>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid gap-3">
          <button
            type="button"
            onClick={captureStorefrontLocation}
            className="inline-flex items-center justify-center rounded-full border border-[#cadccf] px-4 py-3 text-sm font-semibold text-[#254636] transition hover:border-[#86b49d]"
          >
            {locationState === "loading"
              ? "Capturing storefront location..."
              : "Use current storefront location"}
          </button>

          <div className="grid gap-3">
            <input
              {...register("addressLine1")}
              autoComplete="address-line1"
              className="rounded-[1.1rem] border border-[#cadccf] bg-[#f4faf6] px-4 py-3 text-sm text-[#173126] outline-none transition focus:border-[#5d9c7f]"
              placeholder="Street address"
            />
            <input
              {...register("addressLine2")}
              autoComplete="address-line2"
              className="rounded-[1.1rem] border border-[#cadccf] bg-[#f4faf6] px-4 py-3 text-sm text-[#173126] outline-none transition focus:border-[#5d9c7f]"
              placeholder="Suite or unit (optional)"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                {...register("city")}
                autoComplete="address-level2"
                className="rounded-[1.1rem] border border-[#cadccf] bg-[#f4faf6] px-4 py-3 text-sm text-[#173126] outline-none transition focus:border-[#5d9c7f]"
                placeholder="City"
              />
              <input
                {...register("state")}
                autoComplete="address-level1"
                className="rounded-[1.1rem] border border-[#cadccf] bg-[#f4faf6] px-4 py-3 text-sm text-[#173126] outline-none transition focus:border-[#5d9c7f]"
                placeholder="State"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                {...register("postalCode")}
                autoComplete="postal-code"
                className="rounded-[1.1rem] border border-[#cadccf] bg-[#f4faf6] px-4 py-3 text-sm text-[#173126] outline-none transition focus:border-[#5d9c7f]"
                placeholder="Postal code"
              />
              <input
                {...register("countryCode")}
                autoComplete="country"
                className="rounded-[1.1rem] border border-[#cadccf] bg-[#f4faf6] px-4 py-3 text-sm text-[#173126] outline-none transition focus:border-[#5d9c7f]"
                placeholder="Country"
              />
            </div>
          </div>

          <p className="rounded-[1.4rem] bg-[#eef7f1] px-4 py-3 text-sm leading-7 text-[#315343]">
            Later feed and fulfillment work will trust this storefront location,
            so the address needs to be real. Google geocoding verifies the
            typed address at save time, and captured browser coordinates remain
            the fallback proof point when needed.
          </p>
          {errors.addressLine1 ? (
            <p className="text-sm text-[#b13f2f]">{errors.addressLine1.message}</p>
          ) : null}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-3">
          <input
            {...register("contactEmail")}
            className="rounded-[1.1rem] border border-[#cadccf] bg-[#f4faf6] px-4 py-3 text-sm text-[#173126] outline-none transition focus:border-[#5d9c7f]"
            placeholder="Pickup contact email"
            type="email"
          />
          <input
            {...register("contactPhone")}
            className="rounded-[1.1rem] border border-[#cadccf] bg-[#f4faf6] px-4 py-3 text-sm text-[#173126] outline-none transition focus:border-[#5d9c7f]"
            placeholder="Pickup contact phone"
          />
          <textarea
            {...register("pickupHours")}
            className="min-h-28 rounded-[1.1rem] border border-[#cadccf] bg-[#f4faf6] px-4 py-3 text-sm text-[#173126] outline-none transition focus:border-[#5d9c7f]"
            placeholder="Open daily 8am-9pm, pickups held until 9:30pm"
          />
          {[
            errors.contactEmail?.message,
            errors.contactPhone?.message,
            errors.pickupHours?.message,
          ]
            .filter(Boolean)
            .map((message) => (
              <p key={message} className="text-sm text-[#b13f2f]">
                {message}
              </p>
            ))}
        </section>
      ) : null}

      {serverError ? (
        <div className="rounded-[1.4rem] bg-[#fff1ee] px-4 py-3 text-sm text-[#b13f2f]">
          {serverError}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={previousStep}
          disabled={step === 1 || isPending}
          className="inline-flex items-center justify-center rounded-full border border-[#cadccf] px-4 py-3 text-sm font-semibold text-[#254636] transition hover:border-[#86b49d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        {step < steps.length ? (
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center justify-center rounded-full bg-[#173126] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#264637]"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-[#173126] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#264637] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Finish seller setup"}
          </button>
        )}
      </div>
    </form>
  );
}
