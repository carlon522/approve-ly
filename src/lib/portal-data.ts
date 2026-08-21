import {
  Archive,
  Bell,
  CheckCircle2,
  Clock3,
  Database,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export type Status =
  | "Submitted"
  | "In Review"
  | "Changes Requested"
  | "Approved"
  | "Archive Scheduled";

export type Platform = "Instagram" | "TikTok" | "YouTube Shorts";

export type ContentItem = {
  id: string;
  title: string;
  platform: Platform;
  status: Status;
  type: "Video" | "Image" | "Carousel";
  folder: string;
  due: string;
  owner: string;
  version: string;
  size: string;
  comments: number;
  unresolved: number;
  progress: number;
  accent: string;
};

export type Metric = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "amber" | "red";
};

export const metrics: Metric[] = [
  {
    label: "Pending approval",
    value: "18",
    detail: "7 due this week",
    icon: Clock3,
    tone: "blue",
  },
  {
    label: "Open comments",
    value: "42",
    detail: "11 blocking approval",
    icon: MessageCircle,
    tone: "amber",
  },
  {
    label: "Approved this week",
    value: "9",
    detail: "3 ready to archive",
    icon: CheckCircle2,
    tone: "green",
  },
  {
    label: "Storage used",
    value: "6.8GB",
    detail: "10GB total limit",
    icon: Database,
    tone: "red",
  },
];

export const contentItems: ContentItem[] = [
  {
    id: "APL-1084",
    title: "Summer drop reveal",
    platform: "Instagram",
    status: "Changes Requested",
    type: "Video",
    folder: "Paid social / Reels",
    due: "Today, 16:00",
    owner: "Maya Chen",
    version: "V3",
    size: "1.4GB",
    comments: 8,
    unresolved: 2,
    progress: 68,
    accent: "#0f8a5f",
  },
  {
    id: "APL-1085",
    title: "Creator cutdown 02",
    platform: "TikTok",
    status: "In Review",
    type: "Video",
    folder: "Organic / Creator edits",
    due: "Tomorrow, 10:00",
    owner: "Noah Patel",
    version: "V1",
    size: "886MB",
    comments: 3,
    unresolved: 0,
    progress: 100,
    accent: "#111111",
  },
  {
    id: "APL-1088",
    title: "Carousel benefits set",
    platform: "Instagram",
    status: "Submitted",
    type: "Carousel",
    folder: "Launch / Static",
    due: "Aug 24, 09:30",
    owner: "Lina Torres",
    version: "V2",
    size: "212MB",
    comments: 0,
    unresolved: 0,
    progress: 100,
    accent: "#2563eb",
  },
  {
    id: "APL-1091",
    title: "Founder short Q3",
    platform: "YouTube Shorts",
    status: "Approved",
    type: "Video",
    folder: "Founder content",
    due: "Aug 26, 12:00",
    owner: "Elliot Ross",
    version: "V4",
    size: "2.1GB",
    comments: 16,
    unresolved: 0,
    progress: 100,
    accent: "#c2410c",
  },
];

export const folders = [
  { name: "Paid social", count: 21 },
  { name: "Organic", count: 14 },
  { name: "Creator edits", count: 9 },
  { name: "Founder content", count: 6 },
];

export const campaigns = [
  {
    name: "Q3 Launch",
    company: "Northstar Studio",
    due: "Aug 28",
    status: "Active",
    approvers: "4 approvers",
    progress: 72,
  },
  {
    name: "Evergreen Shorts",
    company: "Kindred Goods",
    due: "Sep 06",
    status: "Review",
    approvers: "2 approvers",
    progress: 46,
  },
  {
    name: "Back to Work",
    company: "Aster Home",
    due: "Sep 12",
    status: "Planning",
    approvers: "3 approvers",
    progress: 24,
  },
];

export const comments = [
  {
    author: "Priya S.",
    role: "Approver",
    anchor: "00:13.08",
    body: "Logo lockup is too close to the caption safe area. Please lift it before approval.",
    status: "Open",
  },
  {
    author: "Marcus L.",
    role: "Approver",
    anchor: "Frame 214",
    body: "Can we swap the second product angle for the brighter take from V2?",
    status: "Open",
  },
  {
    author: "Maya C.",
    role: "Creative",
    anchor: "Slide 3",
    body: "Updated the CTA contrast and resolved the copy note from legal.",
    status: "Resolved",
  },
];

export const activity = [
  { icon: Bell, title: "Comment bundle sent", meta: "11 minutes ago" },
  { icon: CheckCircle2, title: "Founder short approved", meta: "42 minutes ago" },
  { icon: Archive, title: "3 files ready for final download", meta: "Today" },
];
