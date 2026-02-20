import { addFlowLog } from "@/lib/flowLogs";

export async function createCheckoutTokenClient(
  requestBody: Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ token: string; data: Record<string, any> }> {
  const startTime = Date.now();
  const response = await fetch("/api/afterpay/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  const duration = Date.now() - startTime;

  addFlowLog({
    type: "api_request",
    label: "Create Checkout",
    method: "POST",
    endpoint: "/api/afterpay/checkout \u2192 /v2/checkouts",
    data: data._meta?.requestBody || requestBody,
    fullUrl: data._meta?.fullUrl,
    headers: data._meta?.headers,
  });

  addFlowLog({
    type: "api_response",
    label: "Checkout Created",
    method: "POST",
    endpoint: "/v2/checkouts",
    status: response.status,
    data: data,
    duration,
    fullUrl: data._meta?.fullUrl,
  });

  if (data.error) {
    throw new Error(data.error);
  }

  return { token: data.token, data };
}
