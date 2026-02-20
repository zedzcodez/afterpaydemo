import { useState, useEffect } from "react";
import { SDK_POLL_INTERVAL_MS } from "@/lib/constants";

export function useAfterpayReady(
  checkFn?: (sdk: NonNullable<typeof window.Afterpay>) => boolean
): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const check = () => {
      if (typeof window !== "undefined" && window.Afterpay) {
        if (!checkFn || checkFn(window.Afterpay)) {
          setIsReady(true);
          return;
        }
      }
      timeoutId = setTimeout(check, SDK_POLL_INTERVAL_MS);
    };
    check();
    return () => clearTimeout(timeoutId);
  }, [checkFn]);

  return isReady;
}
