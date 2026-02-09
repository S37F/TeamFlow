import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch } from "@/lib/api";

export function useOrganization() {
  const { data: organization, isLoading } = useQuery({
    queryKey: [api.organization.get.path],
    queryFn: async () => {
      const res = await authFetch(api.organization.get.path);
      if (!res.ok) throw new Error("Failed to fetch organization");
      return res.json();
    },
  });

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: [api.organization.members.path],
    queryFn: async () => {
      const res = await authFetch(api.organization.members.path);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  return { organization, members, isLoading: isLoading || isLoadingMembers };
}
