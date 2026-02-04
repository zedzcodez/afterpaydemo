"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-3",
};

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  return (
    <div
      className={`${sizes[size]} border-afterpay-mint border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}

export function LoadingDots({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="w-2 h-2 bg-afterpay-mint rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-afterpay-mint rounded-full animate-bounce animate-delay-100" />
      <div className="w-2 h-2 bg-afterpay-mint rounded-full animate-bounce animate-delay-200" />
    </div>
  );
}
