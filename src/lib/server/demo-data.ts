import {
  campaigns,
  comments,
  contentItems,
  folders,
  type Platform,
} from "@/lib/portal-data";
import type { Profile, PortalActivity, PortalComment, PortalContent } from "./types";

const campaignSeed = campaigns.map((campaign, index) => ({
  ...campaign,
  id: `campaign-${index + 1}`,
}));

export function getDemoBootstrap(profile?: Profile) {
  const content: PortalContent[] = contentItems.map((item, index) => {
    const campaign = campaignSeed[index === 3 ? 1 : 0];

    return {
      ...item,
      campaign: campaign.name,
      company: campaign.company,
      fileName: `${item.id.toLowerCase()}-${item.type.toLowerCase()}.mp4`,
      shareMode: "Private",
      tags:
        index === 0
          ? ["paid social", "launch", "creator", "talent:Amelia Rose"]
          : index === 1
            ? ["organic", "creator", "talent:Theo Park"]
            : index === 2
              ? ["carousel", "static", "talent:Amelia Rose"]
              : ["founder", "shorts", "talent:Elliot Ross"],
    };
  });

  const portalComments: PortalComment[] = comments.map((comment, index) => ({
    ...comment,
    contentId: "APL-1084",
    id: `comment-${index + 1}`,
    role: comment.role,
    status: comment.status as "Open" | "Resolved",
  }));

  const activity: PortalActivity[] = [
    { id: "activity-1", kind: "bell", title: "Comment bundle sent for Summer drop reveal", meta: "11 minutes ago" },
    { id: "activity-2", kind: "check", title: "Founder short Q3 approved", meta: "42 minutes ago" },
    { id: "activity-3", kind: "archive", title: "3 files ready for final download", meta: "Today" },
  ];

  return {
    activity,
    campaigns: campaignSeed,
    comments: portalComments,
    contentItems: content,
    folders: folders.map((folder, index) => ({ ...folder, id: `folder-${index + 1}` })),
    profile:
      profile ??
      ({
        email: "creative@approvely.app",
        id: "demo-user",
        name: "Carlo",
        role: "Creative",
        roleConfirmed: true,
      } satisfies Profile),
  };
}

export function platformAccent(platform: Platform) {
  if (platform === "Instagram") {
    return "#db2777";
  }

  if (platform === "TikTok") {
    return "#111111";
  }

  return "#dc2626";
}
