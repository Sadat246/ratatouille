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
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isComplete || isCurrent
                    ? "bg-[#1f1410] text-white"
                    : "border border-[#dcc5b6] bg-white text-[#7a5645]"
                }`}
              >
                {stepNumber}
              </div>
              <div
                className={`h-1 flex-1 rounded-full ${
                  isComplete ? "bg-[#1f1410]" : "bg-[#ebdacf]"
                } ${stepNumber === steps.length ? "hidden" : ""}`}
              />
            </div>
          );
        })}
      </div>
      <div className="grid gap-1">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#9a5537]">
          Step {currentStep} of {steps.length}
        </p>
        <p className="text-lg font-semibold tracking-[-0.03em] text-[#241510]">
          {steps[currentStep - 1]}
        </p>
      </div>
    </div>
  );
}
