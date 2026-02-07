import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useOrganization() {
  const { data: organization, isLoading } = useQuery({
    queryKey: [api.organization.get.path],
    queryFn: async () => {
      const res = await fetch(api.organization.get.path);
      if (!res.ok) throw new Error("Failed to fetch organization");
      return api.organization.get.responses[200].parse(await res.json());
    },
  });

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: [api.organization.members.path],
    queryFn: async () => {
      const res = await fetch(api.organization.members.path);
      if (!res.ok) throw new Error("Failed to fetch members");
      return api.organization.members.responses[200].parse(await res.json());
    },
  });

  return { organization, members, isLoading: isLoading || isLoadingMembers };
}
