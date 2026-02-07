"use client";

export function CheckoutCashApp({ onShippingChange }: { onShippingChange?: (option: { id: string; name: string; description?: string; price: number }) => void }) {
  return (
    <div className="text-center py-12 text-afterpay-gray-500">
      Cash App Pay component loading...
    </div>
  );
}
