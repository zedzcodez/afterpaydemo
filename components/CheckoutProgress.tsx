"use client";

export type CheckoutStep = "cart" | "checkout" | "shipping" | "review" | "confirmation";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={3}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

interface CheckoutProgressProps {
  currentStep: CheckoutStep;
  showShipping?: boolean;
  showReview?: boolean;
}

const STEPS: { id: CheckoutStep; label: string }[] = [
  { id: "cart", label: "Cart" },
  { id: "checkout", label: "Checkout" },
  { id: "shipping", label: "Shipping" },
  { id: "review", label: "Review" },
  { id: "confirmation", label: "Confirm" },
];

export function CheckoutProgress({
  currentStep,
  showShipping = false,
  showReview = false,
}: CheckoutProgressProps) {
  // Filter steps based on checkout flow
  const visibleSteps = STEPS.filter((step) => {
    if (step.id === "shipping" && !showShipping) return false;
    if (step.id === "review" && !showReview) return false;
    return true;
  });

  const currentIndex = visibleSteps.findIndex((step) => step.id === currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {visibleSteps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === visibleSteps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    font-semibold text-sm transition-all duration-300
                    ${
                      isCompleted
                        ? "bg-afterpay-mint text-afterpay-black"
                        : isCurrent
                          ? "bg-afterpay-black text-white ring-4 ring-afterpay-mint/30"
                          : "bg-afterpay-gray-100 text-afterpay-gray-400"
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`
                    mt-2 text-xs font-medium whitespace-nowrap
                    ${
                      isCompleted || isCurrent
                        ? "text-afterpay-black"
                        : "text-afterpay-gray-400"
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 mx-3 mt-[-1.5rem]">
                  <div
                    className={`
                      h-1 rounded-full transition-all duration-500
                      ${isCompleted ? "bg-afterpay-mint" : "bg-afterpay-gray-200"}
                    `}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
