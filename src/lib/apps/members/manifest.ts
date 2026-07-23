import type { AppManifest } from "@/lib/platform/types";

export const membersApp: AppManifest = {
  id: "members",
  name: "Članovi",
  route: "/members",
  requiredAccess: ["read:members", "invite:members"],
};
