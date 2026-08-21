"use client";

import {
  Archive,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Database,
  Download,
  Eye,
  FileStack,
  Folder,
  FolderPlus,
  Gauge,
  ImageIcon,
  Inbox,
  Link,
  LockKeyhole,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  PanelRight,
  Play,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  Tag,
  Upload,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  campaigns,
  comments,
  contentItems,
  folders,
  type ContentItem,
  type Platform,
  type Status,
} from "@/lib/portal-data";
import {
  createBrowserSupabaseClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/browser";
import type { BootstrapPayload } from "@/lib/server/types";

type Role = "Creative" | "Approver" | "Assistant";
type View = "Dashboard" | "Campaigns" | "Inbox" | "Archive" | "Team";
type ToastTone = "success" | "warning" | "neutral";
type ActivityKind = "bell" | "check" | "archive" | "upload" | "comment" | "share";

type Session = {
  accessToken?: string;
  name: string;
  email: string;
  role: Role;
};

type PortalCampaign = (typeof campaigns)[number] & {
  id: string;
};

type PortalFolder = (typeof folders)[number] & {
  id: string;
};

type PortalContent = ContentItem & {
  campaign: string;
  company: string;
  tags: string[];
  fileName?: string;
  mimeType?: string;
  shareMode?: "Private" | "Public";
  approvedAt?: string;
  archiveDeleteAt?: string;
  storageKey?: string;
};

type PortalComment = {
  id: string;
  contentId: string;
  author: string;
  role: Role | string;
  anchor: string;
  body: string;
  status: "Open" | "Resolved";
};

type PortalActivity = {
  id: string;
  kind: ActivityKind;
  title: string;
  meta: string;
};

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type UploadDraft = {
  title: string;
  platform: Platform;
  type: PortalContent["type"];
  folder: string;
  due: string;
  file?: File;
  tags: string;
  fileName: string;
  fileSize: string;
  mimeType?: string;
};

const statusStyles: Record<Status, string> = {
  Submitted: "border-blue-200 bg-blue-50 text-blue-700",
  "In Review": "border-zinc-200 bg-zinc-50 text-zinc-700",
  "Changes Requested": "border-amber-200 bg-amber-50 text-amber-800",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Archive Scheduled": "border-orange-200 bg-orange-50 text-orange-800",
};

const metricToneStyles = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-800 border-amber-100",
  red: "bg-orange-50 text-orange-800 border-orange-100",
};

const platformStyles: Record<Platform, string> = {
  Instagram: "border-pink-200 bg-pink-50 text-pink-700",
  TikTok: "border-zinc-300 bg-zinc-100 text-zinc-900",
  "YouTube Shorts": "border-red-200 bg-red-50 text-red-700",
};

const roleCapabilities: Record<
  Role,
  {
    canCreate: boolean;
    canApprove: boolean;
    canComment: boolean;
    canArchive: boolean;
    assignedCampaigns?: string[];
  }
> = {
  Creative: {
    canArchive: true,
    canApprove: true,
    canComment: true,
    canCreate: true,
  },
  Approver: {
    assignedCampaigns: ["Q3 Launch"],
    canArchive: false,
    canApprove: true,
    canComment: true,
    canCreate: false,
  },
  Assistant: {
    canArchive: false,
    canApprove: false,
    canComment: false,
    canCreate: false,
  },
};

const activityIcons: Record<ActivityKind, LucideIcon> = {
  archive: Archive,
  bell: Clock3,
  check: CheckCircle2,
  comment: MessageCircle,
  share: Share2,
  upload: Upload,
};

const campaignSeed: PortalCampaign[] = campaigns.map((campaign, index) => ({
  ...campaign,
  id: `campaign-${index + 1}`,
}));

const folderSeed: PortalFolder[] = folders.map((folder, index) => ({
  ...folder,
  id: `folder-${index + 1}`,
}));

const contentSeed: PortalContent[] = contentItems.map((item, index) => {
  const campaign = campaignSeed[index === 3 ? 1 : 0];

  return {
    ...item,
    campaign: campaign.name,
    company: campaign.company,
    fileName: `${item.id.toLowerCase()}-${item.type.toLowerCase()}.mp4`,
    shareMode: "Private",
    tags:
      index === 0
        ? ["paid social", "launch", "creator"]
        : index === 1
          ? ["organic", "creator"]
          : index === 2
            ? ["carousel", "static"]
            : ["founder", "shorts"],
  };
});

const commentSeed: PortalComment[] = comments.map((comment, index) => ({
  ...comment,
  contentId: "APL-1084",
  id: `comment-${index + 1}`,
  role: comment.role as Role | "Approver",
  status: comment.status as "Open" | "Resolved",
}));

const activitySeed: PortalActivity[] = [
  { id: "activity-1", kind: "bell", title: "Comment bundle sent", meta: "11 minutes ago" },
  { id: "activity-2", kind: "check", title: "Founder short approved", meta: "42 minutes ago" },
  { id: "activity-3", kind: "archive", title: "3 files ready for final download", meta: "Today" },
];

const defaultUploadDraft: UploadDraft = {
  due: "Aug 28, 16:00",
  fileName: "",
  fileSize: "",
  folder: "Paid social / Reels",
  platform: "Instagram",
  tags: "paid social, launch",
  title: "",
  type: "Video",
};

export default function PortalClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [campaignList, setCampaignList] = useState<PortalCampaign[]>(campaignSeed);
  const [folderList, setFolderList] = useState<PortalFolder[]>(folderSeed);
  const [contentList, setContentList] = useState<PortalContent[]>(contentSeed);
  const [commentList, setCommentList] = useState<PortalComment[]>(commentSeed);
  const [activityList, setActivityList] = useState<PortalActivity[]>(activitySeed);
  const [selectedCompany, setSelectedCompany] = useState(campaignSeed[0].company);
  const [selectedCampaign, setSelectedCampaign] = useState(campaignSeed[0].name);
  const [selectedFolder, setSelectedFolder] = useState("All folders");
  const [activeItemId, setActiveItemId] = useState(contentSeed[0].id);
  const [activePlatform, setActivePlatform] = useState<Platform>("Instagram");
  const [activeView, setActiveView] = useState<View>("Dashboard");
  const [query, setQuery] = useState("");
  const [filterReviewOnly, setFilterReviewOnly] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      return;
    }

    let cancelled = false;
    const supabase = createBrowserSupabaseClient();

    async function restoreSession() {
      const { data } = await supabase.auth.getSession();

      if (cancelled || !data.session?.access_token || !data.session.user.email) {
        return;
      }

      setSession({
        accessToken: data.session.access_token,
        email: data.session.user.email,
        name:
          typeof data.session.user.user_metadata?.name === "string"
            ? data.session.user.user_metadata.name
            : data.session.user.email,
        role: "Creative",
      });
    }

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession?.access_token || !nextSession.user.email) {
        setSession(null);
        return;
      }

      setSession({
        accessToken: nextSession.access_token,
        email: nextSession.user.email,
        name:
          typeof nextSession.user.user_metadata?.name === "string"
            ? nextSession.user.user_metadata.name
            : nextSession.user.email,
        role: "Creative",
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      return;
    }

    const token = new URLSearchParams(window.location.search).get("share");

    if (!token) {
      return;
    }

    const shareToken = token;
    let cancelled = false;

    async function loadPublicShare() {
      const response = await fetch(`/api/share/${encodeURIComponent(shareToken)}`);

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as BootstrapPayload & { mode: "share" };

      if (cancelled) {
        return;
      }

      setActivityList(payload.activity);
      setCampaignList(payload.campaigns);
      setCommentList(payload.comments);
      setContentList(payload.contentItems);
      setFolderList(payload.folders);
      setSession({
        email: payload.profile.email,
        name: payload.profile.name,
        role: "Assistant",
      });

      const firstCampaign = payload.campaigns[0];
      const firstContent = payload.contentItems[0];

      if (firstCampaign) {
        setSelectedCompany(firstCampaign.company);
        setSelectedCampaign(firstCampaign.name);
      }

      if (firstContent) {
        setActiveItemId(firstContent.id);
        setActivePlatform(firstContent.platform);
      }
    }

    void loadPublicShare();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    const accessToken = session?.accessToken;

    if (!accessToken) {
      return;
    }

    const liveAccessToken = accessToken;
    let cancelled = false;

    async function loadLiveWorkspace() {
      try {
        const payload = await apiRequest<BootstrapPayload & { mode: "live" | "demo" }>(
          "/api/bootstrap",
          liveAccessToken,
        );

        if (cancelled) {
          return;
        }

        setActivityList(payload.activity);
        setCampaignList(payload.campaigns);
        setCommentList(payload.comments);
        setContentList(payload.contentItems);
        setFolderList(payload.folders);
        setSession((current) =>
          current
            ? {
                ...current,
                email: payload.profile.email,
                name: payload.profile.name,
                role: payload.profile.role,
              }
            : current,
        );

        const firstCampaign = payload.campaigns[0];
        const firstContent = payload.contentItems[0];

        if (firstCampaign) {
          setSelectedCompany(firstCampaign.company);
          setSelectedCampaign(firstCampaign.name);
        }

        if (firstContent) {
          setActiveItemId(firstContent.id);
          setActivePlatform(firstContent.platform);
        }
      } catch {
        if (!cancelled) {
          setSession((current) => current && { ...current, accessToken: undefined });
        }
      }
    }

    void loadLiveWorkspace();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const notify = (message: string, tone: ToastTone = "success") => {
    const id = Date.now();
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 3600);
  };

  const capabilities = session ? roleCapabilities[session.role] : roleCapabilities.Creative;

  const companies = useMemo(() => {
    const availableCampaigns =
      session?.role === "Approver"
        ? campaignList.filter((campaign) =>
            capabilities.assignedCampaigns?.includes(campaign.name),
          )
        : campaignList;

    return Array.from(new Set(availableCampaigns.map((campaign) => campaign.company)));
  }, [campaignList, capabilities.assignedCampaigns, session?.role]);

  const visibleCampaigns = useMemo(() => {
    const byCompany = campaignList.filter((campaign) => campaign.company === selectedCompany);

    if (session?.role === "Approver") {
      return byCompany.filter((campaign) =>
        capabilities.assignedCampaigns?.includes(campaign.name),
      );
    }

    return byCompany;
  }, [campaignList, capabilities.assignedCampaigns, selectedCompany, session?.role]);

  const currentCampaign = visibleCampaigns.some(
    (campaign) => campaign.name === selectedCampaign,
  )
    ? selectedCampaign
    : visibleCampaigns[0]?.name ?? selectedCampaign;

  const firstCampaignForCompany = (company: string) => {
    const matches = campaignList.filter((campaign) => campaign.company === company);
    const allowed =
      session?.role === "Approver"
        ? matches.filter((campaign) =>
            capabilities.assignedCampaigns?.includes(campaign.name),
          )
        : matches;

    return allowed[0]?.name ?? selectedCampaign;
  };

  const scopedContent = useMemo(() => {
    return contentList.filter((item) => {
      const inCompany = item.company === selectedCompany;
      const inCampaign = item.campaign === currentCampaign;
      const isAssigned =
        session?.role !== "Approver" ||
        capabilities.assignedCampaigns?.includes(item.campaign);

      return inCompany && inCampaign && isAssigned;
    });
  }, [
    capabilities.assignedCampaigns,
    currentCampaign,
    contentList,
    selectedCompany,
    session?.role,
  ]);

  const queueContent = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return scopedContent.filter((item) => {
      const folderMatch =
        selectedFolder === "All folders" ||
        item.folder.toLowerCase().includes(selectedFolder.toLowerCase());
      const queryMatch =
        !normalizedQuery ||
        [item.id, item.title, item.owner, item.folder, item.platform, ...item.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const reviewMatch =
        !filterReviewOnly ||
        item.status === "Submitted" ||
        item.status === "In Review" ||
        item.status === "Changes Requested";
      const viewMatch =
        activeView === "Archive"
          ? item.status === "Archive Scheduled" || item.status === "Approved"
          : activeView === "Inbox"
            ? item.status === "Submitted" ||
              item.status === "In Review" ||
              item.status === "Changes Requested"
            : true;

      return folderMatch && queryMatch && reviewMatch && viewMatch;
    });
  }, [activeView, filterReviewOnly, query, scopedContent, selectedFolder]);

  const activeItem =
    scopedContent.find((item) => item.id === activeItemId) ?? queueContent[0] ?? scopedContent[0];
  const activeComments = activeItem
    ? commentList.filter((comment) => comment.contentId === activeItem.id)
    : [];

  const metrics = useMemo(() => {
    const pending = contentList.filter((item) =>
      ["Submitted", "In Review", "Changes Requested"].includes(item.status),
    ).length;
    const openComments = contentList.reduce((total, item) => total + item.unresolved, 0);
    const approved = contentList.filter((item) => item.status === "Approved").length;
    const storage = contentList.reduce((total, item) => total + sizeToGb(item.size), 0);

    return [
      {
        detail: `${queueContent.length} visible in this campaign`,
        icon: Clock3,
        label: "Pending approval",
        tone: "blue" as const,
        value: String(pending),
      },
      {
        detail: `${commentList.length} comments total`,
        icon: MessageCircle,
        label: "Open comments",
        tone: "amber" as const,
        value: String(openComments),
      },
      {
        detail: "Ready for final download",
        icon: CheckCircle2,
        label: "Approved",
        tone: "green" as const,
        value: String(approved),
      },
      {
        detail: "10GB total limit",
        icon: Database,
        label: "Storage used",
        tone: "red" as const,
        value: `${storage.toFixed(1)}GB`,
      },
    ];
  }, [commentList.length, contentList, queueContent.length]);

  const addActivity = (kind: ActivityKind, title: string, meta = "Just now") => {
    setActivityList((items) => [
      { id: `activity-${Date.now()}`, kind, meta, title },
      ...items.slice(0, 7),
    ]);
  };

  const requirePermission = (allowed: boolean, message: string) => {
    if (allowed) {
      return true;
    }

    notify(message, "warning");
    return false;
  };

  const callBackend = async <T,>(
    path: string,
    init?: ApiRequestInit,
  ) => {
    if (!session?.accessToken) {
      return null;
    }

    try {
      return await apiRequest<T>(path, session.accessToken, init);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backend request failed.";
      notify(message, "warning");
      return null;
    }
  };

  const handleLogin = (nextSession: Session) => {
    setSession(nextSession);
    setActiveView("Dashboard");
    notify(`Signed in as ${nextSession.name}`);
  };

  const handleLogout = () => {
    if (isSupabaseBrowserConfigured()) {
      void createBrowserSupabaseClient().auth.signOut();
    }

    setSession(null);
    notify("Signed out", "neutral");
  };

  const handleUpload = async (draft: UploadDraft) => {
    if (!requirePermission(capabilities.canCreate, "Assistant and Approver roles cannot upload.")) {
      return;
    }

    let storageKey: string | undefined;

    if (draft.file && session?.accessToken) {
      const presign = await callBackend<{
        bucket: string;
        contentType: string;
        expiresIn: number;
        maxBytes: number;
        storageKey: string;
        uploadToken: string;
      }>("/api/uploads/presign", {
        body: {
          contentType: draft.mimeType || draft.file.type || "application/octet-stream",
          fileName: draft.file.name,
          size: draft.file.size,
        },
        method: "POST",
      });

      if (!presign) {
        return;
      }

      const { error: uploadError } = await createBrowserSupabaseClient()
        .storage
        .from(presign.bucket)
        .uploadToSignedUrl(presign.storageKey, presign.uploadToken, draft.file, {
          contentType: draft.mimeType || draft.file.type || "application/octet-stream",
        });

      if (uploadError) {
        notify("Supabase Storage upload failed before content was saved.", "warning");
        return;
      }

      storageKey = presign.storageKey;
    }

    const folderName = draft.folder.trim() || "Unsorted";
    const tags = draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const saved = await callBackend<{ item: PortalContent }>("/api/content", {
      body: {
        campaign: currentCampaign,
        company: selectedCompany,
        due: draft.due.trim() || "No due date",
        fileName: draft.fileName,
        folder: folderName,
        mimeType: draft.mimeType,
        platform: draft.platform,
        size: draft.fileSize || "0MB",
        storageKey,
        tags,
        title: draft.title.trim() || "Untitled content",
        type: draft.type,
      },
      method: "POST",
    });

    if (saved?.item) {
      setContentList((items) => [saved.item, ...items]);
      setFolderList((items) => bumpFolderCount(items, saved.item.folder));
      setActiveItemId(saved.item.id);
      setActivePlatform(saved.item.platform);
      addActivity("upload", `${saved.item.title} uploaded`);
      notify("Upload saved to the live approval queue");
      return;
    }

    if (session?.accessToken) {
      return;
    }

    const nextId = `APL-${1100 + contentList.length + 1}`;
    const nextItem: PortalContent = {
      accent: draft.platform === "Instagram" ? "#db2777" : draft.platform === "TikTok" ? "#111111" : "#dc2626",
      campaign: currentCampaign,
      comments: 0,
      company: selectedCompany,
      due: draft.due.trim() || "No due date",
      fileName: draft.fileName || `${nextId.toLowerCase()}-asset`,
      folder: folderName,
      id: nextId,
      owner: session?.name ?? "Creative",
      platform: draft.platform,
      progress: 100,
      shareMode: "Private",
      size: draft.fileSize || "0MB",
      status: "Submitted",
      tags,
      title: draft.title.trim() || "Untitled content",
      type: draft.type,
      unresolved: 0,
      version: "V1",
    };

    setContentList((items) => [nextItem, ...items]);
    setFolderList((items) => bumpFolderCount(items, folderName));
    setActiveItemId(nextItem.id);
    setActivePlatform(nextItem.platform);
    addActivity("upload", `${nextItem.title} uploaded`);
    notify("Upload added to the approval queue");
  };

  const handleAddCampaign = async (name: string, company: string, due: string) => {
    if (!requirePermission(capabilities.canCreate, "Only Creatives can create campaigns.")) {
      return;
    }

    const saved = await callBackend<{ campaign: PortalCampaign }>("/api/campaigns", {
      body: {
        company: company.trim() || selectedCompany,
        due: due.trim() || "No due date",
        name: name.trim() || "Untitled campaign",
      },
      method: "POST",
    });

    if (saved?.campaign) {
      setCampaignList((items) => [saved.campaign, ...items]);
      setSelectedCompany(saved.campaign.company);
      setSelectedCampaign(saved.campaign.name);
      addActivity("bell", `${saved.campaign.name} created`);
      notify("Campaign created");
      return;
    }

    if (session?.accessToken) {
      return;
    }

    const nextCampaign: PortalCampaign = {
      approvers: "0 approvers",
      company: company.trim() || selectedCompany,
      due: due.trim() || "No due date",
      id: `campaign-${Date.now()}`,
      name: name.trim() || "Untitled campaign",
      progress: 0,
      status: "Planning",
    };

    setCampaignList((items) => [nextCampaign, ...items]);
    setSelectedCompany(nextCampaign.company);
    setSelectedCampaign(nextCampaign.name);
    addActivity("bell", `${nextCampaign.name} created`);
    notify("Campaign created");
  };

  const handleAddFolder = async (name: string) => {
    if (!requirePermission(capabilities.canCreate, "Only Creatives can create folders.")) {
      return;
    }

    const folderName = name.trim() || "New folder";
    const saved = await callBackend<{ folder: PortalFolder }>("/api/folders", {
      body: {
        campaign: currentCampaign,
        company: selectedCompany,
        name: folderName,
      },
      method: "POST",
    });

    if (saved?.folder) {
      setFolderList((items) => [saved.folder, ...items]);
      setSelectedFolder(saved.folder.name);
      addActivity("bell", `${saved.folder.name} folder created`);
      notify("Folder created");
      return;
    }

    if (session?.accessToken) {
      return;
    }

    setFolderList((items) => bumpFolderCount(items, folderName, 0));
    setSelectedFolder(folderName);
    addActivity("bell", `${folderName} folder created`);
    notify("Folder created");
  };

  const handleAddComment = async (body: string, anchor: string) => {
    if (!activeItem) {
      return;
    }

    if (!requirePermission(capabilities.canComment, "Assistant view is read-only.")) {
      return;
    }

    const saved = await callBackend<{ comment: PortalComment; item: PortalContent }>(
      `/api/content/${activeItem.id}/comments`,
      {
        body: {
          anchor: anchor.trim() || "General",
          body: body.trim(),
        },
        method: "POST",
      },
    );

    if (saved?.comment && saved.item) {
      setCommentList((items) => [saved.comment, ...items]);
      setContentList((items) => replaceContentItem(items, saved.item));
      addActivity("comment", `Comment added to ${activeItem.id}`);
      notify("Comment added and approval paused", "warning");
      return;
    }

    if (session?.accessToken) {
      return;
    }

    const nextComment: PortalComment = {
      anchor: anchor.trim() || "General",
      author: session?.name ?? "Reviewer",
      body: body.trim(),
      contentId: activeItem.id,
      id: `comment-${Date.now()}`,
      role: session?.role ?? "Approver",
      status: "Open",
    };

    setCommentList((items) => [nextComment, ...items]);
    setContentList((items) =>
      items.map((item) =>
        item.id === activeItem.id
          ? {
              ...item,
              comments: item.comments + 1,
              status: "Changes Requested",
              unresolved: item.unresolved + 1,
            }
          : item,
      ),
    );
    addActivity("comment", `Comment added to ${activeItem.id}`);
    notify("Comment added and approval paused", "warning");
  };

  const handleResolveComment = async (commentId: string) => {
    if (!activeItem) {
      return;
    }

    if (!requirePermission(capabilities.canComment, "Assistant view is read-only.")) {
      return;
    }

    const target = commentList.find((comment) => comment.id === commentId);

    if (!target || target.status === "Resolved") {
      return;
    }

    const saved = await callBackend<{ comment: PortalComment; item: PortalContent }>(
      `/api/comments/${commentId}/resolve`,
      {
        method: "POST",
      },
    );

    if (saved?.comment && saved.item) {
      setCommentList((items) =>
        items.map((comment) => (comment.id === saved.comment.id ? saved.comment : comment)),
      );
      setContentList((items) => replaceContentItem(items, saved.item));
      addActivity("comment", `Comment resolved on ${activeItem.id}`);
      notify("Comment resolved");
      return;
    }

    if (session?.accessToken) {
      return;
    }

    setCommentList((items) =>
      items.map((comment) =>
        comment.id === commentId ? { ...comment, status: "Resolved" } : comment,
      ),
    );
    setContentList((items) =>
      items.map((item) => {
        if (item.id !== activeItem.id) {
          return item;
        }

        const nextUnresolved = Math.max(0, item.unresolved - 1);

        return {
          ...item,
          status: nextUnresolved === 0 ? "In Review" : item.status,
          unresolved: nextUnresolved,
        };
      }),
    );
    addActivity("comment", `Comment resolved on ${activeItem.id}`);
    notify("Comment resolved");
  };

  const handleApprove = async () => {
    if (!activeItem) {
      return;
    }

    if (!requirePermission(capabilities.canApprove, "Assistant view is read-only.")) {
      return;
    }

    if (activeItem.unresolved > 0) {
      notify("Resolve open comments before approval.", "warning");
      return;
    }

    const saved = await callBackend<{ item: PortalContent }>(
      `/api/content/${activeItem.id}/approve`,
      {
        method: "POST",
      },
    );

    if (saved?.item) {
      setContentList((items) => replaceContentItem(items, saved.item));
      addActivity("check", `${saved.item.title} approved`);
      notify("Approved in one click");
      return;
    }

    if (session?.accessToken) {
      return;
    }

    setContentList((items) =>
      items.map((item) =>
        item.id === activeItem.id
          ? {
              ...item,
              approvedAt: "Just now",
              status: "Approved",
            }
          : item,
      ),
    );
    addActivity("check", `${activeItem.title} approved`);
    notify("Approved in one click");
  };

  const handleDownload = async (item: PortalContent, final = false) => {
    const saved = await callBackend<{
      downloadUrl?: string;
      item?: PortalContent;
      metadata?: unknown;
    }>(`/api/content/${item.id}/download?final=${final ? "true" : "false"}`);

    if (saved?.downloadUrl) {
      downloadFromUrl(saved.downloadUrl);
      if (saved.item) {
        setContentList((items) => replaceContentItem(items, saved.item as PortalContent));
      }
      notify(final ? "Final download link opened" : "Download link opened");
      return;
    }

    if (saved?.metadata) {
      downloadJson(`${item.id.toLowerCase()}-${final ? "final" : "asset"}.json`, saved.metadata);
      if (saved.item) {
        setContentList((items) => replaceContentItem(items, saved.item as PortalContent));
      }
      notify(final ? "Final download started" : "Download started");
      return;
    }

    if (session?.accessToken) {
      return;
    }

    const payload = {
      campaign: item.campaign,
      company: item.company,
      downloadedAt: new Date().toISOString(),
      fileName: item.fileName,
      id: item.id,
      platform: item.platform,
      status: item.status,
      tags: item.tags,
      title: item.title,
      type: item.type,
      version: item.version,
    };

    downloadJson(`${item.id.toLowerCase()}-${final ? "final" : "asset"}.json`, payload);
    notify(final ? "Final download started" : "Download started");

    if (final && item.status === "Approved") {
      const archiveDeleteAt = formatDateOffset(7);

      setContentList((items) =>
        items.map((content) =>
          content.id === item.id
            ? {
                ...content,
                archiveDeleteAt,
                status: "Archive Scheduled",
              }
            : content,
        ),
      );
      addActivity("archive", `${item.title} queued for archive`);
    }
  };

  const handleBundleDownload = () => {
    const bundle = queueContent.filter((item) => item.status === "Approved");

    if (!bundle.length) {
      notify("No approved files in this view to bundle.", "warning");
      return;
    }

    downloadJson("approve-ly-approved-bundle.json", {
      count: bundle.length,
      files: bundle,
      generatedAt: new Date().toISOString(),
    });
    notify(`${bundle.length} approved files bundled`);
  };

  const handleArchive = async (item: PortalContent) => {
    if (!requirePermission(capabilities.canArchive, "Only Creatives can schedule archive.")) {
      return;
    }

    if (item.status !== "Approved" && item.status !== "Archive Scheduled") {
      notify("Only approved content can be archived.", "warning");
      return;
    }

    const saved = await callBackend<{ item: PortalContent }>(`/api/content/${item.id}/archive`, {
      method: "POST",
    });

    if (saved?.item) {
      setContentList((items) => replaceContentItem(items, saved.item));
      addActivity("archive", `${saved.item.title} marked for archive`);
      notify("Archive scheduled with 7 day hold");
      return;
    }

    if (session?.accessToken) {
      return;
    }

    const archiveDeleteAt = formatDateOffset(7);
    setContentList((items) =>
      items.map((content) =>
        content.id === item.id
          ? {
              ...content,
              archiveDeleteAt,
              status: "Archive Scheduled",
            }
          : content,
      ),
    );
    addActivity("archive", `${item.title} marked for archive`);
    notify("Archive scheduled with 7 day hold");
  };

  const handleShare = async (mode: "Private" | "Public") => {
    if (!activeItem) {
      return;
    }

    const saved = await callBackend<{ item: PortalContent; url: string }>(
      `/api/content/${activeItem.id}/share`,
      {
        body: { mode },
        method: "POST",
      },
    );

    if (saved?.url && saved.item) {
      setContentList((items) => replaceContentItem(items, saved.item));
      void navigator.clipboard?.writeText(saved.url).catch(() => undefined);
      addActivity("share", `${mode} link created for ${activeItem.id}`);
      notify(`${mode} share link copied`);
      return;
    }

    if (session?.accessToken) {
      return;
    }

    const url = `${window.location.origin}/?content=${activeItem.id}&share=${mode.toLowerCase()}`;

    setContentList((items) =>
      items.map((item) => (item.id === activeItem.id ? { ...item, shareMode: mode } : item)),
    );
    void navigator.clipboard?.writeText(url).catch(() => undefined);
    addActivity("share", `${mode} link created for ${activeItem.id}`);
    notify(`${mode} share link copied`);
  };

  const resetDemo = () => {
    window.localStorage.removeItem("approveLyPortalState");
    setCampaignList(campaignSeed);
    setFolderList(folderSeed);
    setContentList(contentSeed);
    setCommentList(commentSeed);
    setActivityList(activitySeed);
    setSelectedCompany(campaignSeed[0].company);
    setSelectedCampaign(campaignSeed[0].name);
    setSelectedFolder("All folders");
    setActiveItemId(contentSeed[0].id);
    setActivePlatform("Instagram");
    notify("Demo data reset", "neutral");
  };

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-zinc-950">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-3 py-3 sm:px-5 lg:flex-row lg:p-5">
        <Sidebar
          activeView={activeView}
          onChangeView={setActiveView}
          onLogout={handleLogout}
          onReset={resetDemo}
          role={session.role}
          storageValue={metrics[3].value}
        />
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <Topbar
            campaigns={visibleCampaigns}
            companies={companies}
            company={selectedCompany}
            onCampaignChange={setSelectedCampaign}
            onCompanyChange={(company) => {
              setSelectedCompany(company);
              setSelectedCampaign(firstCampaignForCompany(company));
              setSelectedFolder("All folders");
            }}
            onNewUpload={() => {
              if (requirePermission(capabilities.canCreate, "Only Creatives can upload.")) {
                setUploadOpen(true);
              }
            }}
            campaign={currentCampaign}
            name={session.name}
            role={session.role}
          />
          <DashboardGrid metrics={metrics} />
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
            <CampaignWorkspace
              activeItemId={activeItem?.id}
              activeView={activeView}
              campaigns={visibleCampaigns}
              contentItems={queueContent}
              filterReviewOnly={filterReviewOnly}
              folders={folderList}
              onAddCampaign={() => {
                if (requirePermission(capabilities.canCreate, "Only Creatives can create campaigns.")) {
                  setCampaignOpen(true);
                }
              }}
              onAddFolder={() => {
                if (requirePermission(capabilities.canCreate, "Only Creatives can create folders.")) {
                  setFolderOpen(true);
                }
              }}
              onDownload={handleDownload}
              onFolderSelect={setSelectedFolder}
              onMore={(item) => {
                setActiveItemId(item.id);
                setShareOpen(true);
              }}
              onSearch={setQuery}
              onSelectCampaign={(campaign) => {
                setSelectedCompany(campaign.company);
                setSelectedCampaign(campaign.name);
                setSelectedFolder("All folders");
              }}
              onSelectItem={(item) => {
                setActiveItemId(item.id);
                setActivePlatform(item.platform);
              }}
              onToggleFilter={() => setFilterReviewOnly((value) => !value)}
              onUpload={() => {
                if (requirePermission(capabilities.canCreate, "Only Creatives can upload.")) {
                  setUploadOpen(true);
                }
              }}
              query={query}
              selectedCampaign={currentCampaign}
              selectedFolder={selectedFolder}
            />
            <ApprovalWorkspace
              activeComments={activeComments}
              activeItem={activeItem}
              activePlatform={activePlatform}
              activityList={activityList}
              canArchive={capabilities.canArchive}
              canApprove={capabilities.canApprove}
              canComment={capabilities.canComment}
              onAddComment={() => {
                if (requirePermission(capabilities.canComment, "Assistant view is read-only.")) {
                  setCommentOpen(true);
                }
              }}
              onApprove={handleApprove}
              onArchive={handleArchive}
              onBundleDownload={handleBundleDownload}
              onDownload={handleDownload}
              onPlatformChange={setActivePlatform}
              onResolveComment={handleResolveComment}
              onShare={() => setShareOpen(true)}
            />
          </section>
        </section>
      </div>

      <ToastStack toasts={toasts} />

      {uploadOpen ? (
        <UploadModal
          defaultFolder={selectedFolder === "All folders" ? defaultUploadDraft.folder : selectedFolder}
          folders={folderList}
          onClose={() => setUploadOpen(false)}
          onSubmit={(draft) => {
            handleUpload(draft);
            setUploadOpen(false);
          }}
        />
      ) : null}

      {campaignOpen ? (
        <CampaignModal
          company={selectedCompany}
          onClose={() => setCampaignOpen(false)}
          onSubmit={(name, company, due) => {
            handleAddCampaign(name, company, due);
            setCampaignOpen(false);
          }}
        />
      ) : null}

      {folderOpen ? (
        <FolderModal
          onClose={() => setFolderOpen(false)}
          onSubmit={(name) => {
            handleAddFolder(name);
            setFolderOpen(false);
          }}
        />
      ) : null}

      {shareOpen && activeItem ? (
        <ShareModal
          item={activeItem}
          onClose={() => setShareOpen(false)}
          onShare={(mode) => {
            handleShare(mode);
            setShareOpen(false);
          }}
        />
      ) : null}

      {commentOpen && activeItem ? (
        <CommentModal
          item={activeItem}
          onClose={() => setCommentOpen(false)}
          onSubmit={(body, anchor) => {
            handleAddComment(body, anchor);
            setCommentOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [name, setName] = useState("Carlo");
  const [email, setEmail] = useState("creative@approvely.app");
  const [password, setPassword] = useState("approval");
  const [role, setRole] = useState<Role>("Creative");
  const [error, setError] = useState("");
  const liveAuth = isSupabaseBrowserConfigured();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (liveAuth) {
      const supabase = createBrowserSupabaseClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.session?.access_token || !data.user.email) {
        setError(signInError?.message ?? "Sign in failed.");
        return;
      }

      setError("");
      onLogin({
        accessToken: data.session.access_token,
        email: data.user.email,
        name:
          typeof data.user.user_metadata?.name === "string"
            ? data.user.user_metadata.name
            : name.trim() || data.user.email,
        role,
      });
      return;
    }

    onLogin({
      email,
      name: name.trim() || email.split("@")[0] || "User",
      role,
    });
  };

  return (
    <main className="grid min-h-screen bg-[#f7f7f4] px-4 py-8 text-zinc-950 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.7fr)] lg:gap-8 lg:px-8">
      <section className="mx-auto flex w-full max-w-4xl flex-col justify-between rounded-lg border border-[#dedbd2] bg-white p-5 shadow-sm lg:min-h-[calc(100vh-64px)] lg:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
              A
            </div>
            <div>
              <p className="text-base font-semibold">Approve.ly</p>
              <p className="text-sm text-zinc-500">Social approval portal</p>
            </div>
          </div>
          <ShieldCheck aria-hidden className="size-5 text-emerald-700" />
        </div>

        <div className="py-12 sm:py-16">
          <p className="text-sm font-semibold text-emerald-700">Mobile-first approval ops</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
            Review content, request changes, approve, download, and archive from one workspace.
          </h1>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Campaigns" value="3" />
            <MiniStat label="Assets" value="24" />
            <MiniStat label="Open notes" value="42" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <RoleCard icon={Upload} label="Creative" />
          <RoleCard icon={Check} label="Approver" />
          <RoleCard icon={Eye} label="Assistant" />
        </div>
      </section>

      <section className="mx-auto mt-4 w-full max-w-xl rounded-lg border border-[#dedbd2] bg-white p-4 shadow-sm lg:mt-0 lg:self-center">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {liveAuth
              ? "Email/password and Google use Supabase Auth."
              : "Demo mode is active until Supabase env vars are added."}
          </p>
        </div>
        {error ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            {error}
          </div>
        ) : null}
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-medium">
            Name
            <input
              className="h-11 rounded-md border border-zinc-200 px-3 outline-none transition focus:border-zinc-400"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Email
            <input
              className="h-11 rounded-md border border-zinc-200 px-3 outline-none transition focus:border-zinc-400"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Password
            <input
              className="h-11 rounded-md border border-zinc-200 px-3 outline-none transition focus:border-zinc-400"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Role
            <select
              className="h-11 rounded-md border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-400"
              onChange={(event) => setRole(event.target.value as Role)}
              value={role}
            >
              <option>Creative</option>
              <option>Approver</option>
              <option>Assistant</option>
            </select>
          </label>
          <button
            className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            type="submit"
          >
            <LockKeyhole aria-hidden className="size-4" />
            Sign in
          </button>
        </form>
        <button
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold transition hover:border-zinc-300"
          onClick={() => {
            if (liveAuth) {
              const supabase = createBrowserSupabaseClient();
              void supabase.auth.signInWithOAuth({
                options: {
                  redirectTo: window.location.origin,
                },
                provider: "google",
              });
              return;
            }

            onLogin({
              email: "google.user@approvely.app",
              name: "Google User",
              role,
            });
          }}
          type="button"
        >
          <ShieldCheck aria-hidden className="size-4" />
          Continue with Google
        </button>
      </section>
    </main>
  );
}

function Sidebar({
  activeView,
  onChangeView,
  onLogout,
  onReset,
  role,
  storageValue,
}: {
  activeView: View;
  onChangeView: (view: View) => void;
  onLogout: () => void;
  onReset: () => void;
  role: Role;
  storageValue: string;
}) {
  const navItems: { label: View; icon: LucideIcon }[] = [
    { label: "Dashboard", icon: Gauge },
    { label: "Campaigns", icon: Folder },
    { label: "Inbox", icon: Inbox },
    { label: "Archive", icon: Archive },
    { label: "Team", icon: Users },
  ];

  return (
    <aside className="flex shrink-0 flex-col gap-3 rounded-lg border border-[#dedbd2] bg-white p-3 shadow-sm lg:sticky lg:top-5 lg:h-[calc(100vh-40px)] lg:w-64">
      <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Approve.ly</p>
            <p className="truncate text-xs text-zinc-500">{role} view</p>
          </div>
        </div>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-zinc-500" />
      </div>

      <nav className="grid grid-cols-5 gap-1 lg:grid-cols-1" aria-label="Primary">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium transition lg:justify-start ${
              activeView === item.label
                ? "bg-zinc-950 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            }`}
            onClick={() => onChangeView(item.label)}
            type="button"
          >
            <item.icon aria-hidden className="size-4 shrink-0" />
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto hidden rounded-lg border border-emerald-100 bg-emerald-50 p-3 lg:block">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <ShieldCheck aria-hidden className="size-4" />
          {storageValue} storage used
        </div>
        <div className="mt-3 h-2 rounded-md bg-white">
          <div className="h-2 w-[68%] rounded-md bg-emerald-600" />
        </div>
        <p className="mt-2 text-xs leading-5 text-emerald-800">
          Approved files can be downloaded and marked for archive.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
          onClick={onReset}
          type="button"
        >
          <Database aria-hidden className="size-4" />
          <span className="hidden lg:inline">Reset demo</span>
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
          onClick={onLogout}
          type="button"
        >
          <LogOut aria-hidden className="size-4" />
          <span className="hidden lg:inline">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function Topbar({
  campaign,
  campaigns,
  companies,
  company,
  name,
  onCampaignChange,
  onCompanyChange,
  onNewUpload,
  role,
}: {
  campaign: string;
  campaigns: PortalCampaign[];
  companies: string[];
  company: string;
  name: string;
  onCampaignChange: (campaign: string) => void;
  onCompanyChange: (company: string) => void;
  onNewUpload: () => void;
  role: Role;
}) {
  return (
    <header className="rounded-lg border border-[#dedbd2] bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">
            Welcome, {name} <span className="text-zinc-400">/ {role}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-950 sm:text-3xl">
            Content approval command center
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SelectField
            icon={Building2}
            label="Company"
            onChange={onCompanyChange}
            options={companies}
            value={company}
          />
          <SelectField
            icon={CalendarDays}
            label="Campaign"
            onChange={onCampaignChange}
            options={campaigns.map((item) => item.name)}
            value={campaign}
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            onClick={onNewUpload}
            type="button"
          >
            <Plus aria-hidden className="size-4" />
            New upload
          </button>
        </div>
      </div>
    </header>
  );
}

function SelectField({
  icon: Icon,
  label,
  onChange,
  options,
  value,
}: {
  icon: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="relative inline-flex h-11 min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 transition focus-within:border-zinc-400 sm:min-w-48">
      <Icon aria-hidden className="size-4 shrink-0 text-zinc-500" />
      <span className="sr-only">{label}</span>
      <select
        className="min-w-0 flex-1 appearance-none bg-transparent pr-6 outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 size-4 text-zinc-400" />
    </label>
  );
}

function DashboardGrid({
  metrics,
}: {
  metrics: {
    detail: string;
    icon: LucideIcon;
    label: string;
    tone: keyof typeof metricToneStyles;
    value: string;
  }[];
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
}

function MetricCard({
  metric,
}: {
  metric: {
    detail: string;
    icon: LucideIcon;
    label: string;
    tone: keyof typeof metricToneStyles;
    value: string;
  };
}) {
  return (
    <article className="rounded-lg border border-[#dedbd2] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">{metric.label}</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">{metric.value}</p>
        </div>
        <div className={`grid size-10 place-items-center rounded-md border ${metricToneStyles[metric.tone]}`}>
          <metric.icon aria-hidden className="size-5" />
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-600">{metric.detail}</p>
    </article>
  );
}

function CampaignWorkspace({
  activeItemId,
  activeView,
  campaigns,
  contentItems,
  filterReviewOnly,
  folders,
  onAddCampaign,
  onAddFolder,
  onDownload,
  onFolderSelect,
  onMore,
  onSearch,
  onSelectCampaign,
  onSelectItem,
  onToggleFilter,
  onUpload,
  query,
  selectedCampaign,
  selectedFolder,
}: {
  activeItemId?: string;
  activeView: View;
  campaigns: PortalCampaign[];
  contentItems: PortalContent[];
  filterReviewOnly: boolean;
  folders: PortalFolder[];
  onAddCampaign: () => void;
  onAddFolder: () => void;
  onDownload: (item: PortalContent, final?: boolean) => void;
  onFolderSelect: (folder: string) => void;
  onMore: (item: PortalContent) => void;
  onSearch: (query: string) => void;
  onSelectCampaign: (campaign: PortalCampaign) => void;
  onSelectItem: (item: PortalContent) => void;
  onToggleFilter: () => void;
  onUpload: () => void;
  query: string;
  selectedCampaign: string;
  selectedFolder: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <Panel title={activeView === "Team" ? "Assigned campaigns" : "Campaigns"} action={<IconButton label="Add campaign" icon={Plus} onClick={onAddCampaign} />}>
          <div className="grid gap-3">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                className={`rounded-lg border bg-white p-3 text-left transition hover:border-zinc-300 ${
                  selectedCampaign === campaign.name ? "border-zinc-950" : "border-zinc-200"
                }`}
                onClick={() => onSelectCampaign(campaign)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{campaign.name}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{campaign.company}</p>
                  </div>
                  <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    {campaign.status}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-zinc-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 aria-hidden className="size-4" />
                    {campaign.due}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users aria-hidden className="size-4" />
                    {campaign.approvers}
                  </span>
                </div>
                <ProgressBar value={campaign.progress} className="mt-3" />
              </button>
            ))}
          </div>
        </Panel>

        <UploadPanel onUpload={onUpload} />
      </div>

      <Panel title="Campaign folders" action={<IconButton label="Add folder" icon={FolderPlus} onClick={onAddFolder} />}>
        <div className="grid gap-2 sm:grid-cols-2">
          <FolderButton
            active={selectedFolder === "All folders"}
            count={contentItems.length}
            name="All folders"
            onClick={() => onFolderSelect("All folders")}
          />
          {folders.map((folder) => (
            <FolderButton
              active={selectedFolder === folder.name}
              count={folder.count}
              key={folder.id}
              name={folder.name}
              onClick={() => onFolderSelect(folder.name)}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title={activeView === "Archive" ? "Download queue" : "Content queue"}
        action={
          <div className="flex items-center gap-2">
            <div className="hidden h-10 items-center rounded-md border border-zinc-200 bg-white px-3 sm:flex">
              <Search aria-hidden className="mr-2 size-4 text-zinc-500" />
              <input
                className="w-40 bg-transparent text-sm outline-none"
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Search"
                value={query}
              />
            </div>
            <IconButton label="Search" icon={Search} onClick={() => onSearch(query ? "" : selectedCampaign)} />
            <IconButton
              active={filterReviewOnly}
              label="Filter"
              icon={PanelRight}
              onClick={onToggleFilter}
            />
          </div>
        }
      >
        <div className="grid gap-3">
          {contentItems.length ? (
            contentItems.map((item) => (
              <ContentCard
                active={activeItemId === item.id}
                item={item}
                key={item.id}
                onDownload={() => onDownload(item)}
                onMore={() => onMore(item)}
                onSelect={() => onSelectItem(item)}
              />
            ))
          ) : (
            <EmptyState icon={Folder} title="No content in this view" />
          )}
        </div>
      </Panel>
    </section>
  );
}

function UploadPanel({ onUpload }: { onUpload: () => void }) {
  return (
    <Panel title="Upload brief" action={<IconButton label="Upload" icon={Upload} onClick={onUpload} />}>
      <button
        className="w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-left transition hover:border-zinc-400"
        onClick={onUpload}
        type="button"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-white text-zinc-700 shadow-sm">
            <Upload aria-hidden className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Direct upload ready</h2>
            <p className="mt-1 text-sm leading-5 text-zinc-600">
              Source assets, platform tags, folder labels, and due dates are captured together.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <Field label="Content type" value="Video, Image, Carousel" icon={FileStack} />
          <Field label="Platforms" value="Instagram, TikTok, YouTube Shorts" icon={Smartphone} />
          <Field label="Max file" value="50MB per file" icon={Video} />
          <Field label="Tags" value="Paid social, launch, creator" icon={Tag} />
        </div>
      </button>
      <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
        <div className="flex items-start gap-2 text-sm text-orange-900">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="leading-5">
            Storage warning at 85%. Approved files can move into the archive queue after final download.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function Field({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2">
      <Icon aria-hidden className="size-4 shrink-0 text-zinc-500" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="truncate text-sm font-semibold text-zinc-900">{value}</p>
      </div>
    </div>
  );
}

function FolderButton({
  active,
  count,
  name,
  onClick,
}: {
  active: boolean;
  count: number;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex h-16 items-center justify-between rounded-lg border bg-white px-3 text-left transition hover:border-zinc-300 ${
        active ? "border-zinc-950" : "border-zinc-200"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">
          <Folder aria-hidden className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="text-xs text-zinc-500">{count} items</span>
        </span>
      </span>
      <ChevronDown aria-hidden className="size-4 -rotate-90 text-zinc-400" />
    </button>
  );
}

function ContentCard({
  active,
  item,
  onDownload,
  onMore,
  onSelect,
}: {
  active: boolean;
  item: PortalContent;
  onDownload: () => void;
  onMore: () => void;
  onSelect: () => void;
}) {
  return (
    <article
      className={`grid gap-3 rounded-lg border bg-white p-3 shadow-sm transition lg:grid-cols-[150px_minmax(0,1fr)_auto] lg:items-center ${
        active ? "border-zinc-950" : "border-zinc-200"
      }`}
    >
      <button
        className="relative aspect-video overflow-hidden rounded-md bg-zinc-950 text-left"
        onClick={onSelect}
        type="button"
      >
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: `linear-gradient(135deg, ${item.accent}, #18181b 70%)`,
          }}
        />
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between text-white">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/40 px-2 py-1 text-xs font-semibold">
            {item.type === "Video" ? <Play aria-hidden className="size-3" /> : <ImageIcon aria-hidden className="size-3" />}
            {item.type}
          </span>
          <span className="text-xs font-semibold">{item.version}</span>
        </div>
      </button>
      <button className="min-w-0 text-left" onClick={onSelect} type="button">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${platformStyles[item.platform]}`}>
            {item.platform}
          </span>
          <StatusBadge status={item.status} />
          {item.shareMode === "Public" ? (
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
              Public link
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 truncate text-base font-semibold">{item.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
          <span>{item.id}</span>
          <span>{item.folder}</span>
          <span>{item.size}</span>
        </div>
      </button>
      <div className="flex items-center justify-between gap-3 lg:min-w-48 lg:justify-end">
        <div className="text-sm">
          <p className="font-semibold text-zinc-900">{item.due}</p>
          <p className="mt-1 text-zinc-500">{item.owner}</p>
        </div>
        <div className="flex items-center gap-1">
          <CommentCounter comments={item.comments} unresolved={item.unresolved} />
          <IconButton label="Download" icon={Download} onClick={onDownload} />
          <IconButton label="More" icon={MoreHorizontal} onClick={onMore} />
        </div>
      </div>
    </article>
  );
}

function CommentCounter({ comments, unresolved }: { comments: number; unresolved: number }) {
  return (
    <span
      className={`inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border px-2 text-sm font-semibold ${
        unresolved > 0
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-zinc-200 bg-white text-zinc-600"
      }`}
      title={`${unresolved} unresolved comments`}
    >
      <MessageCircle aria-hidden className="size-4" />
      {comments}
    </span>
  );
}

function ApprovalWorkspace({
  activeComments,
  activeItem,
  activePlatform,
  activityList,
  canArchive,
  canApprove,
  canComment,
  onAddComment,
  onApprove,
  onArchive,
  onBundleDownload,
  onDownload,
  onPlatformChange,
  onResolveComment,
  onShare,
}: {
  activeComments: PortalComment[];
  activeItem?: PortalContent;
  activePlatform: Platform;
  activityList: PortalActivity[];
  canArchive: boolean;
  canApprove: boolean;
  canComment: boolean;
  onAddComment: () => void;
  onApprove: () => void;
  onArchive: (item: PortalContent) => void;
  onBundleDownload: () => void;
  onDownload: (item: PortalContent, final?: boolean) => void;
  onPlatformChange: (platform: Platform) => void;
  onResolveComment: (commentId: string) => void;
  onShare: () => void;
}) {
  if (!activeItem) {
    return (
      <section className="flex min-w-0 flex-col gap-4">
        <Panel title="Approval review">
          <EmptyState icon={Inbox} title="Select content to review" />
        </Panel>
      </section>
    );
  }

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <Panel
        title="Approval review"
        action={
          <div className="flex items-center gap-2">
            <IconButton label="Private link" icon={LockKeyhole} onClick={onShare} />
            <IconButton label="Share" icon={Share2} onClick={onShare} />
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.92fr)_minmax(260px,1fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(260px,0.92fr)_minmax(260px,1fr)]">
          <PlatformPreview
            item={activeItem}
            platform={activePlatform}
            onPlatformChange={onPlatformChange}
          />
          <ReviewPanel
            canApprove={canApprove}
            canComment={canComment}
            comments={activeComments}
            item={activeItem}
            onAddComment={onAddComment}
            onApprove={onApprove}
            onResolveComment={onResolveComment}
          />
        </div>
      </Panel>
      <ArchivePanel
        canArchive={canArchive}
        item={activeItem}
        onArchive={() => onArchive(activeItem)}
        onBundleDownload={onBundleDownload}
        onFinalDownload={() => onDownload(activeItem, true)}
      />
      <ActivityPanel activityList={activityList} />
    </section>
  );
}

function PlatformPreview({
  item,
  onPlatformChange,
  platform,
}: {
  item: PortalContent;
  onPlatformChange: (platform: Platform) => void;
  platform: Platform;
}) {
  const tabs: Platform[] = ["Instagram", "TikTok", "YouTube Shorts"];
  const [playing, setPlaying] = useState(false);

  return (
    <div className="min-w-0">
      <div className="mb-3 grid grid-cols-3 rounded-md border border-zinc-200 bg-zinc-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`h-9 rounded-md text-xs font-semibold transition ${
              platform === tab ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
            }`}
            onClick={() => onPlatformChange(tab)}
            type="button"
          >
            {tab === "YouTube Shorts" ? "Shorts" : tab}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-[330px] rounded-[28px] border border-zinc-300 bg-zinc-950 p-2 shadow-sm">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] bg-black text-white">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 35% 20%, ${item.accent}, transparent 28%), linear-gradient(160deg, #121212 10%, ${item.accent} 48%, #18181b 100%)`,
            }}
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3 text-xs font-semibold">
            <span>9:41</span>
            <span className="rounded-md bg-black/35 px-2 py-1">{platformLabel(platform)}</span>
          </div>
          <div className="absolute inset-x-8 top-20 bottom-28 rounded-md border border-white/35" />
          <div className="absolute left-4 right-16 bottom-5">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-md bg-white text-xs font-bold text-zinc-950">
                {item.company.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-semibold">{platformHandle(platform)}</span>
            </div>
            <p className="mt-3 text-sm leading-5">{item.title}</p>
            <p className="mt-2 text-xs text-white/80">{item.campaign} / {item.version}</p>
          </div>
          <div className="absolute bottom-7 right-3 flex flex-col gap-4">
            <PreviewIcon icon={Check} label={platform === "Instagram" ? "12k" : platform === "TikTok" ? "88k" : "6.4k"} />
            <PreviewIcon icon={MessageCircle} label={String(item.comments)} />
            <PreviewIcon icon={Send} label="Share" />
          </div>
          <button
            aria-label="Play preview"
            className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md bg-white/20 backdrop-blur transition hover:bg-white/30"
            onClick={() => setPlaying((value) => !value)}
            type="button"
          >
            {playing ? <Check aria-hidden className="size-7 text-white" /> : <Play aria-hidden className="size-7 fill-white text-white" />}
          </button>
          <div className="absolute left-[42%] top-[47%] size-5 rounded-md border-2 border-amber-300 bg-amber-300/20" />
          <div className="absolute left-[58%] top-[36%] h-12 w-16 rounded-md border-2 border-blue-300 bg-blue-300/15" />
        </div>
      </div>
    </div>
  );
}

function PreviewIcon({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-[11px] font-semibold">
      <span className="grid size-9 place-items-center rounded-md bg-black/35">
        <Icon aria-hidden className="size-4" />
      </span>
      <span>{label}</span>
    </div>
  );
}

function ReviewPanel({
  canApprove,
  canComment,
  comments,
  item,
  onAddComment,
  onApprove,
  onResolveComment,
}: {
  canApprove: boolean;
  canComment: boolean;
  comments: PortalComment[];
  item: PortalContent;
  onAddComment: () => void;
  onApprove: () => void;
  onResolveComment: (commentId: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      {item.unresolved > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex gap-2">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p className="leading-5">
              Approval is blocked until {item.unresolved} unresolved comment{item.unresolved === 1 ? "" : "s"} are resolved.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="flex gap-2">
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p className="leading-5">Ready for one-click approval.</p>
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-2">
        {comments.length ? (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{comment.author}</p>
                  <p className="text-xs text-zinc-500">
                    {comment.role} at {comment.anchor}
                  </p>
                </div>
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    comment.status === "Open"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {comment.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-5 text-zinc-700">{comment.body}</p>
              {comment.status === "Open" && canComment ? (
                <button
                  className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold transition hover:border-zinc-300"
                  onClick={() => onResolveComment(comment.id)}
                  type="button"
                >
                  <Check aria-hidden className="size-4" />
                  Resolve
                </button>
              ) : null}
            </article>
          ))
        ) : (
          <EmptyState icon={MessageCircle} title="No comments on this content" />
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:opacity-50"
          disabled={!canComment}
          onClick={onAddComment}
          type="button"
        >
          <MessageCircle aria-hidden className="size-4" />
          Comment
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-600"
          disabled={!canApprove}
          onClick={onApprove}
          type="button"
        >
          <Check aria-hidden className="size-4" />
          Approve
        </button>
      </div>
    </div>
  );
}

function ArchivePanel({
  canArchive,
  item,
  onArchive,
  onBundleDownload,
  onFinalDownload,
}: {
  canArchive: boolean;
  item: PortalContent;
  onArchive: () => void;
  onBundleDownload: () => void;
  onFinalDownload: () => void;
}) {
  return (
    <Panel title="Final download and archive">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            {item.archiveDeleteAt ? (
              <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">
                Delete hold until {item.archiveDeleteAt}
              </span>
            ) : (
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
                {item.shareMode ?? "Private"} link
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-5 text-zinc-600">
            {item.status === "Approved"
              ? "Final download can also mark this content for archive with a 7 day hold."
              : "Approved content remains visible when archive is scheduled."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold"
            onClick={onBundleDownload}
            type="button"
          >
            <FileStack aria-hidden className="size-4" />
            Bundle
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold"
            onClick={onFinalDownload}
            type="button"
          >
            <Download aria-hidden className="size-4" />
            Final
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-orange-700 px-3 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:bg-zinc-300 disabled:text-zinc-600"
            disabled={!canArchive}
            onClick={onArchive}
            type="button"
          >
            <Archive aria-hidden className="size-4" />
            Archive
          </button>
        </div>
      </div>
    </Panel>
  );
}

function ActivityPanel({ activityList }: { activityList: PortalActivity[] }) {
  return (
    <Panel title="Activity">
      <ActivityFeed items={activityList} />
    </Panel>
  );
}

function ActivityFeed({ items }: { items: PortalActivity[] }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => {
        const Icon = activityIcons[item.kind];

        return (
          <div key={item.id} className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">
              <Icon aria-hidden className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-zinc-500">{item.meta}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#dedbd2] bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex min-h-10 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function IconButton({
  active = false,
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`grid size-10 place-items-center rounded-md border text-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
      }`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2 rounded-md bg-zinc-100 ${className}`}>
      <div className="h-2 rounded-md bg-emerald-600" style={{ width: `${value}%` }} />
    </div>
  );
}

function UploadModal({
  defaultFolder,
  folders,
  onClose,
  onSubmit,
}: {
  defaultFolder: string;
  folders: PortalFolder[];
  onClose: () => void;
  onSubmit: (draft: UploadDraft) => void;
}) {
  const [draft, setDraft] = useState<UploadDraft>({
    ...defaultUploadDraft,
    folder: defaultFolder,
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(draft);
  };

  return (
    <Modal onClose={onClose} title="New upload">
      <form className="grid gap-3" onSubmit={submit}>
        <TextInput
          label="Title"
          onChange={(value) => setDraft((item) => ({ ...item, title: value }))}
          placeholder="Content title"
          value={draft.title}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput
            label="Platform"
            onChange={(value) => setDraft((item) => ({ ...item, platform: value as Platform }))}
            options={["Instagram", "TikTok", "YouTube Shorts"]}
            value={draft.platform}
          />
          <SelectInput
            label="Type"
            onChange={(value) => setDraft((item) => ({ ...item, type: value as PortalContent["type"] }))}
            options={["Video", "Image", "Carousel"]}
            value={draft.type}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput
            label="Folder"
            onChange={(value) => setDraft((item) => ({ ...item, folder: value }))}
            options={Array.from(new Set([defaultFolder, ...folders.map((folder) => folder.name)]))}
            value={draft.folder}
          />
          <TextInput
            label="Due"
            onChange={(value) => setDraft((item) => ({ ...item, due: value }))}
            value={draft.due}
          />
        </div>
        <TextInput
          label="Tags"
          onChange={(value) => setDraft((item) => ({ ...item, tags: value }))}
          value={draft.tags}
        />
        <label className="grid gap-1.5 text-sm font-medium">
          File
          <input
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-zinc-400"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              setDraft((item) => ({
                ...item,
                file,
                fileName: file.name,
                fileSize: formatBytes(file.size),
                mimeType: file.type || "application/octet-stream",
              }));
            }}
            type="file"
          />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white"
            type="submit"
          >
            <Upload aria-hidden className="size-4" />
            Upload
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CampaignModal({
  company,
  onClose,
  onSubmit,
}: {
  company: string;
  onClose: () => void;
  onSubmit: (name: string, company: string, due: string) => void;
}) {
  const [name, setName] = useState("");
  const [nextCompany, setNextCompany] = useState(company);
  const [due, setDue] = useState("Sep 30");

  return (
    <Modal onClose={onClose} title="Add campaign">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(name, nextCompany, due);
        }}
      >
        <TextInput label="Name" onChange={setName} placeholder="Campaign name" value={name} />
        <TextInput label="Company" onChange={setNextCompany} value={nextCompany} />
        <TextInput label="Due" onChange={setDue} value={due} />
        <button className="h-11 rounded-md bg-zinc-950 text-sm font-semibold text-white" type="submit">
          Create campaign
        </button>
      </form>
    </Modal>
  );
}

function FolderModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <Modal onClose={onClose} title="Add folder">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(name);
        }}
      >
        <TextInput label="Name" onChange={setName} placeholder="Folder name" value={name} />
        <button className="h-11 rounded-md bg-zinc-950 text-sm font-semibold text-white" type="submit">
          Create folder
        </button>
      </form>
    </Modal>
  );
}

function ShareModal({
  item,
  onClose,
  onShare,
}: {
  item: PortalContent;
  onClose: () => void;
  onShare: (mode: "Private" | "Public") => void;
}) {
  return (
    <Modal onClose={onClose} title="Share content">
      <div className="grid gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="mt-1 text-xs text-zinc-500">{item.id} / {item.shareMode ?? "Private"} link</p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold"
          onClick={() => onShare("Private")}
          type="button"
        >
          <LockKeyhole aria-hidden className="size-4" />
          Copy private link
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white"
          onClick={() => onShare("Public")}
          type="button"
        >
          <Link aria-hidden className="size-4" />
          Copy public link
        </button>
      </div>
    </Modal>
  );
}

function CommentModal({
  item,
  onClose,
  onSubmit,
}: {
  item: PortalContent;
  onClose: () => void;
  onSubmit: (body: string, anchor: string) => void;
}) {
  const [anchor, setAnchor] = useState(item.type === "Video" ? "00:13.08" : "Frame 1");
  const [body, setBody] = useState("");

  return (
    <Modal onClose={onClose} title="Request changes">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (body.trim()) {
            onSubmit(body, anchor);
          }
        }}
      >
        <TextInput label="Anchor" onChange={setAnchor} value={anchor} />
        <label className="grid gap-1.5 text-sm font-medium">
          Comment
          <textarea
            className="min-h-28 rounded-md border border-zinc-200 p-3 outline-none transition focus:border-zinc-400"
            onChange={(event) => setBody(event.target.value)}
            placeholder="Reason for non approval"
            value={body}
          />
        </label>
        <button className="h-11 rounded-md bg-zinc-950 text-sm font-semibold text-white" type="submit">
          Submit comment
        </button>
      </form>
    </Modal>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-zinc-950/40 p-3 sm:place-items-center">
      <section className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </div>
        {children}
      </section>
    </div>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        className="h-11 rounded-md border border-zinc-200 px-3 outline-none transition focus:border-zinc-400"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function SelectInput({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select
        className="h-11 rounded-md border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="grid min-h-28 place-items-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center">
      <div>
        <div className="mx-auto grid size-10 place-items-center rounded-md bg-white text-zinc-600 shadow-sm">
          <Icon aria-hidden className="size-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-zinc-700">{title}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function RoleCard({ icon: Icon, label }: { icon: LucideIcon; label: Role }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <Icon aria-hidden className="size-5 text-zinc-700" />
      <p className="mt-3 text-sm font-semibold">{label}</p>
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 grid gap-2 sm:left-auto sm:w-96">
      {toasts.map((toast) => (
        <div
          className={`rounded-lg border p-3 text-sm font-semibold shadow-sm ${
            toast.tone === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : toast.tone === "neutral"
                ? "border-zinc-200 bg-white text-zinc-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
          key={toast.id}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

async function apiRequest<T>(
  path: string,
  accessToken: string,
  init?: ApiRequestInit,
) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  let body = init?.body;

  if (body && !(body instanceof FormData) && !(body instanceof Blob) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(path, {
    ...init,
    body,
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}`);
  }

  return payload as T;
}

type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

function replaceContentItem(items: PortalContent[], item: PortalContent) {
  if (!items.some((existing) => existing.id === item.id)) {
    return [item, ...items];
  }

  return items.map((existing) => (existing.id === item.id ? item : existing));
}

function downloadFromUrl(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  link.target = "_blank";
  document.body.append(link);
  link.click();
  link.remove();
}

function sizeToGb(size: string) {
  const value = Number.parseFloat(size);

  if (Number.isNaN(value)) {
    return 0;
  }

  if (size.toLowerCase().includes("mb")) {
    return value / 1024;
  }

  return value;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function formatDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

function downloadJson(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bumpFolderCount(items: PortalFolder[], folderName: string, increment = 1) {
  const existing = items.find((item) => item.name.toLowerCase() === folderName.toLowerCase());

  if (existing) {
    return items.map((item) =>
      item.id === existing.id ? { ...item, count: item.count + increment } : item,
    );
  }

  return [
    {
      count: increment,
      id: `folder-${Date.now()}`,
      name: folderName,
    },
    ...items,
  ];
}

function platformLabel(platform: Platform) {
  if (platform === "YouTube Shorts") {
    return "Shorts";
  }

  return platform;
}

function platformHandle(platform: Platform) {
  if (platform === "TikTok") {
    return "@northstarstudio";
  }

  if (platform === "YouTube Shorts") {
    return "@NorthstarStudio";
  }

  return "@northstarstudio";
}
