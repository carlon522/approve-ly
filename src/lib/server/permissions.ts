import { ApiError } from "./http";
import type { Profile } from "./types";

export function assertCanCreate(profile: Profile) {
  if (profile.role !== "Creative") {
    throw new ApiError("Only Creative users can create campaigns, folders, and uploads.", 403);
  }
}

export function assertCanComment(profile: Profile) {
  if (profile.role === "Assistant") {
    throw new ApiError("Assistant users have view-only access.", 403);
  }
}

export function assertCanApprove(profile: Profile) {
  if (profile.role === "Assistant") {
    throw new ApiError("Assistant users cannot approve content.", 403);
  }
}

export function assertCanArchive(profile: Profile) {
  if (profile.role !== "Creative") {
    throw new ApiError("Only Creative users can schedule archive.", 403);
  }
}
