"use client";

import { Suspense } from "react";
import { ConfirmationContent } from "@/components/confirmation/ConfirmationContent";

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-afterpay-mint border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Loading...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
