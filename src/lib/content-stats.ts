import type { ContentItem, Status } from "./portal-data";

export type ContentStatsInput = Pick<ContentItem, "status" | "type">;

export type ContentStats = {
  approved: number;
  awaitingApproval: number;
  carousels: number;
  changesRequested: number;
  completionRate: number;
  inReview: number;
  images: number;
  submitted: number;
  total: number;
  videos: number;
};

const statusKeys: Status[] = [
  "Submitted",
  "In Review",
  "Changes Requested",
  "Approved",
  "Archive Scheduled",
];

export function getContentStats(items: ReadonlyArray<ContentStatsInput>): ContentStats {
  const counts = Object.fromEntries(statusKeys.map((status) => [status, 0])) as Record<Status, number>;
  let videos = 0;
  let images = 0;
  let carousels = 0;

  for (const item of items) {
    counts[item.status] += 1;
    videos += item.type === "Video" ? 1 : 0;
    images += item.type === "Image" ? 1 : 0;
    carousels += item.type === "Carousel" ? 1 : 0;
  }

  const total = items.length;
  const approved = counts.Approved + counts["Archive Scheduled"];
  const awaitingApproval = counts.Submitted + counts["In Review"] + counts["Changes Requested"];

  return {
    approved,
    awaitingApproval,
    carousels,
    changesRequested: counts["Changes Requested"],
    completionRate: total ? Math.round((approved / total) * 100) : 0,
    inReview: counts["In Review"],
    images,
    submitted: counts.Submitted,
    total,
    videos,
  };
}
