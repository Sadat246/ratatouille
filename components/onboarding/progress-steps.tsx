"use client";

type ProgressStepsProps = {
  currentStep: number;
  steps: string[];
};

export function ProgressSteps({
  currentStep,
  steps,
}: ProgressStepsProps) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={step} className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                  isComplete || isCurrent
                    ? "bg-[#1a1a1a] text-white"
                    : "border border-[#eaeaea] bg-white text-[#9a9a9a]"
                }`}
              >
                {stepNumber}
              </div>
              <div
                className={`h-px flex-1 rounded-full ${
                  isComplete ? "bg-[#1a1a1a]" : "bg-[#eaeaea]"
                } ${stepNumber === steps.length ? "hidden" : ""}`}
              />
            </div>
          );
        })}
      </div>
      <div className="grid gap-1">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#9a9a9a]">
          Step {currentStep} of {steps.length}
        </p>
        <p className="text-base font-semibold tracking-tight text-[#1a1a1a]">
          {steps[currentStep - 1]}
        </p>
      </div>
    </div>
  );
}
