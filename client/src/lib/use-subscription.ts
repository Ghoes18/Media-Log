import { useQuery } from "@tanstack/react-query";

export type SubscriptionStatus = "free" | "pro";

export function useSubscription(): {
  status: SubscriptionStatus;
  isPro: boolean;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery<{ subscription?: { status: SubscriptionStatus } }>({
    queryKey: ["/api/auth/me"],
  });

  const status = data?.subscription?.status ?? "free";
  return {
    status,
    isPro: status === "pro",
    isLoading: isLoading ?? false,
  };
}
