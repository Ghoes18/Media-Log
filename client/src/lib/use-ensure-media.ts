import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "./queryClient";

export interface EnsureMediaPayload {
  id?: string;
  externalId?: string;
  type: string;
  title: string;
  creator?: string;
  year?: string;
  coverUrl?: string;
  coverGradient?: string;
  synopsis?: string;
  tags?: string[];
  rating?: string;
}

export function useEnsureMedia() {
  const [, setLocation] = useLocation();
  const mutation = useMutation({
    mutationFn: async (m: EnsureMediaPayload) => {
      if (m.id) return { id: m.id };
      const res = await apiRequest("POST", "/api/media/ensure", {
        type: m.type,
        title: m.title,
        creator: m.creator ?? "",
        year: m.year ?? "",
        coverUrl: m.coverUrl ?? "",
        coverGradient: m.coverGradient ?? "from-slate-700 to-slate-900",
        synopsis: m.synopsis ?? "",
        tags: m.tags ?? [],
        rating: m.rating ?? "",
        externalId: m.externalId ?? "",
      });
      const data = await res.json();
      return { id: data.id };
    },
    onSuccess: (data) => {
      setLocation(`/m/${data.id}`);
    },
  });
  return {
    ensureAndNavigate: (m: EnsureMediaPayload) => mutation.mutate(m),
    isPending: mutation.isPending,
  };
}
