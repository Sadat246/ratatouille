"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import type { ConsumerOnboardingInput } from "@/lib/validation/onboarding";

import { ProgressSteps } from "./progress-steps";

type ConsumerWizardProps = {
  defaultName: string;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
};

const steps = [
  "Choose your shopping area",
  "Confirm your shopper identity",
  "Add a delivery address",
];

export function ConsumerWizard({
  defaultName,
  action,
}: ConsumerWizardProps) {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ConsumerOnboardingInput>({
    defaultValues: {
      displayName: defaultName,
      locationQuery: "",
      deliveryCountryCode: "US",
      deliveryAddressLine2: "",
    },
  });
  const [step, setStep] = useState(1);
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "captured" | "error"
  >("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function captureCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationState("error");
      setError("locationQuery", {
        message: "This browser does not support geolocation.",
      });
      return;
    }

    setLocationState("loading");
    clearErrors("locationQuery");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue("browserLatitude", position.coords.latitude, {
          shouldDirty: true,
        });
        setValue("browserLongitude", position.coords.longitude, {
          shouldDirty: true,
        });
        setValue("locationQuery", "Current location", { shouldDirty: true });
        setLocationState("captured");
      },
      () => {
        setLocationState("error");
        setError("locationQuery", {
          message: "Allow location access or enter a ZIP or city manually.",
        });
      },
      {
        enableHighAccuracy: true,
      },
    );
  }

  function nextStep() {
    const values = getValues();

    if (step === 1) {
      const hasLocation =
        typeof values.browserLatitude === "number" ||
        values.locationQuery.trim().length > 0;

      if (!hasLocation) {
        setError("locationQuery", {
          message: "Enter a ZIP or city, or use your current location.",
        });
        return;
      }
    }

    if (step === 2 && values.displayName.trim().length < 2) {
      setError("displayName", {
        message: "Add the name shoppers should see.",
      });
      return;
    }

    clearErrors();
    setStep((current) => Math.min(current + 1, steps.length));
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 1));
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
      className="grid gap-4 rounded-[2.2rem] border border-white/70 bg-white/82 p-5 shadow-[0_24px_90px_rgba(61,35,20,0.1)] backdrop-blur"
    >
      <ProgressSteps currentStep={step} steps={steps} />

      <input type="hidden" {...register("browserLatitude", { valueAsNumber: true })} />
      <input type="hidden" {...register("browserLongitude", { valueAsNumber: true })} />

      {step === 1 ? (
        <section className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2f1d17]">
              ZIP or city
            </span>
            <input
              {...register("locationQuery")}
              className="rounded-[1.1rem] border border-[#dfcabb] bg-[#fff8f2] px-4 py-3 text-sm text-[#2f1d17] outline-none transition focus:border-[#f08a62]"
              placeholder="60607 or Chicago, IL"
            />
          </label>

          <button
            type="button"
            onClick={captureCurrentLocation}
            className="inline-flex items-center justify-center rounded-full border border-[#d6c0b1] px-4 py-3 text-sm font-semibold text-[#452f25] transition hover:border-[#b98e76]"
          >
            {locationState === "loading"
              ? "Capturing current location..."
              : "Use current location"}
          </button>

          <div className="rounded-[1.4rem] bg-[#fff4eb] px-4 py-3 text-sm leading-7 text-[#694737]">
            Typed ZIP or city entries are verified with Google geocoding during
            save. Current location remains the fallback when you want to browse
            around exactly where you are.
          </div>

          {errors.locationQuery ? (
            <p className="text-sm text-[#b13f2f]">{errors.locationQuery.message}</p>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#2f1d17]">
              Display name
            </span>
            <input
              {...register("displayName")}
              className="rounded-[1.1rem] border border-[#dfcabb] bg-[#fff8f2] px-4 py-3 text-sm text-[#2f1d17] outline-none transition focus:border-[#f08a62]"
              placeholder="Alex"
            />
          </label>
          <p className="rounded-[1.4rem] bg-[#eef7f1] px-4 py-3 text-sm leading-7 text-[#2d5746]">
            This defaults to the name from Google, but you can tighten it to the
            shopper-facing name you want on bids and pickups.
          </p>
          {errors.displayName ? (
            <p className="text-sm text-[#b13f2f]">{errors.displayName.message}</p>
          ) : null}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-3">
          <div className="rounded-[1.4rem] bg-[#fff4eb] px-4 py-3 text-sm leading-7 text-[#694737]">
            Add the address you want ready for delivery later. This pass keeps
            address entry manual and verifies it with Google geocoding when you
            save.
          </div>

          <div className="grid gap-3">
            <input
              {...register("deliveryAddressLine1")}
              autoComplete="address-line1"
              className="rounded-[1.1rem] border border-[#dfcabb] bg-[#fff8f2] px-4 py-3 text-sm text-[#2f1d17] outline-none transition focus:border-[#f08a62]"
              placeholder="Street address"
            />
            <input
              {...register("deliveryAddressLine2")}
              autoComplete="address-line2"
              className="rounded-[1.1rem] border border-[#dfcabb] bg-[#fff8f2] px-4 py-3 text-sm text-[#2f1d17] outline-none transition focus:border-[#f08a62]"
              placeholder="Apartment or suite (optional)"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                {...register("deliveryCity")}
                autoComplete="address-level2"
                className="rounded-[1.1rem] border border-[#dfcabb] bg-[#fff8f2] px-4 py-3 text-sm text-[#2f1d17] outline-none transition focus:border-[#f08a62]"
                placeholder="City"
              />
              <input
                {...register("deliveryState")}
                autoComplete="address-level1"
                className="rounded-[1.1rem] border border-[#dfcabb] bg-[#fff8f2] px-4 py-3 text-sm text-[#2f1d17] outline-none transition focus:border-[#f08a62]"
                placeholder="State"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                {...register("deliveryPostalCode")}
                autoComplete="postal-code"
                className="rounded-[1.1rem] border border-[#dfcabb] bg-[#fff8f2] px-4 py-3 text-sm text-[#2f1d17] outline-none transition focus:border-[#f08a62]"
                placeholder="Postal code"
              />
              <input
                {...register("deliveryCountryCode")}
                autoComplete="country"
                className="rounded-[1.1rem] border border-[#dfcabb] bg-[#fff8f2] px-4 py-3 text-sm text-[#2f1d17] outline-none transition focus:border-[#f08a62]"
                placeholder="Country"
              />
            </div>
          </div>

          {[
            errors.deliveryAddressLine1?.message,
            errors.deliveryCity?.message,
            errors.deliveryState?.message,
            errors.deliveryPostalCode?.message,
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
          className="inline-flex items-center justify-center rounded-full border border-[#d6c0b1] px-4 py-3 text-sm font-semibold text-[#452f25] transition hover:border-[#b98e76] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        {step < steps.length ? (
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center justify-center rounded-full bg-[#1f1410] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#38231c]"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-[#1f1410] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#38231c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Finish shopper setup"}
          </button>
        )}
      </div>
    </form>
  );
}
