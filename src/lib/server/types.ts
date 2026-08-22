import type { ContentItem, Platform, Status } from "@/lib/portal-data";

export type Role = "Creative" | "Approver" | "Assistant";
export type ActivityKind = "bell" | "check" | "archive" | "upload" | "comment" | "share";

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  roleConfirmed: boolean;
};

export type PortalCampaign = {
  id: string;
  name: string;
  company: string;
  due: string;
  dueAt?: string;
  status: string;
  approvers: string;
  progress: number;
};

export type PortalCampaignMember = {
  campaignId: string;
  email: string;
  id: string;
  name: string;
  profileId: string;
  role: Role;
};

export type PortalFolder = {
  campaignId?: string;
  id: string;
  name: string;
  count: number;
};

export type PortalContent = ContentItem & {
  campaign: string;
  company: string;
  tags: string[];
  fileName?: string;
  storageKey?: string;
  mimeType?: string;
  shareMode?: "Private" | "Public";
  approvedAt?: string;
  archiveDeleteAt?: string;
};

export type PortalComment = {
  id: string;
  contentId: string;
  author: string;
  role: Role | "Approver" | string;
  anchor: string;
  body: string;
  status: "Open" | "Resolved";
};

export type PortalActivity = {
  id: string;
  kind: ActivityKind;
  title: string;
  meta: string;
};

export type BootstrapPayload = {
  activity: PortalActivity[];
  campaigns: PortalCampaign[];
  comments: PortalComment[];
  contentItems: PortalContent[];
  folders: PortalFolder[];
  profile: Profile;
};

export type CreateContentInput = {
  campaign: string;
  company: string;
  due: string;
  dueAt?: string;
  fileName?: string;
  folder: string;
  mimeType?: string;
  platform: Platform;
  size: string;
  storageKey?: string;
  tags: string[];
  title: string;
  type: PortalContent["type"];
};

export type ContentStatus = Status;
