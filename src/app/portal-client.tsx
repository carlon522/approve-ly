"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Archive,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  MessageSquareText,
  MoreHorizontal,
  Play,
  Plus,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  Undo2,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import type { BootstrapPayload, Profile } from "@/lib/server/types";

type Role = "Creative" | "Approver" | "Assistant";
type View =
  | "Dashboard"
  | "Campaigns"
  | "Comments received"
  | "Content to approve"
  | "Archive"
  | "Team"
  | "Talent content";
type ProjectStage = "campaign" | "folder" | "content";
type ToastTone = "success" | "warning" | "neutral";
type ActivityKind = "bell" | "check" | "archive" | "upload" | "comment" | "share";

type Session = {
  accessToken?: string;
  name: string;
  email: string;
  role: Role;
  roleConfirmed?: boolean;
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

type DeleteTarget = {
  id: string;
  kind: "campaign" | "content" | "folder";
  label: string;
};

type UploadProgress = {
  label: string;
  value: number;
};

type DemoPortalState = {
  activity: PortalActivity[];
  campaigns: PortalCampaign[];
  comments: PortalComment[];
  contentItems: PortalContent[];
  folders: PortalFolder[];
};

type UploadDraft = {
  title: string;
  platform: Platform;
  type: PortalContent["type"];
  folder: string;
  due: string;
  talent: string;
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
    canUnapprove: boolean;
    canComment: boolean;
    canArchive: boolean;
    assignedCampaigns?: string[];
  }
> = {
  Creative: {
    canArchive: true,
    canApprove: true,
    canUnapprove: true,
    canComment: true,
    canCreate: true,
  },
  Approver: {
    assignedCampaigns: ["Q3 Launch"],
    canArchive: false,
    canApprove: true,
    canUnapprove: true,
    canComment: true,
    canCreate: false,
  },
  Assistant: {
    canArchive: false,
    canApprove: false,
    canUnapprove: false,
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
        ? ["paid social", "launch", "creator", "talent:Amelia Rose"]
        : index === 1
          ? ["organic", "creator", "talent:Theo Park"]
          : index === 2
            ? ["carousel", "static", "talent:Amelia Rose"]
            : ["founder", "shorts", "talent:Elliot Ross"],
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
  { id: "activity-1", kind: "bell", title: "Comment bundle sent for Summer drop reveal", meta: "11 minutes ago" },
  { id: "activity-2", kind: "check", title: "Founder short Q3 approved", meta: "42 minutes ago" },
  { id: "activity-3", kind: "archive", title: "3 files ready for final download", meta: "Today" },
];

const defaultUploadDraft: UploadDraft = {
  due: "Aug 28, 16:00",
  fileName: "",
  fileSize: "",
  folder: "Paid social / Reels",
  platform: "Instagram",
  talent: "",
  tags: "paid social, launch",
  title: "",
  type: "Video",
};

const viewRoutes: Record<View, string> = {
  Dashboard: "/dashboard",
  Campaigns: "/campaigns",
  "Comments received": "/comments-received",
  "Content to approve": "/approvals",
  Archive: "/archive",
  Team: "/team",
  "Talent content": "/talent",
};

export default function PortalClient({
  initialCampaignId,
  initialContentId,
  initialFolderId,
  initialTalent,
  initialStage,
  initialView,
}: {
  initialCampaignId?: string;
  initialContentId?: string;
  initialFolderId?: string;
  initialTalent?: string;
  initialStage?: ProjectStage;
  initialView?: View;
} = {}) {
  const router = useRouter();
  const liveAuth = isSupabaseBrowserConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [campaignList, setCampaignList] = useState<PortalCampaign[]>(liveAuth ? [] : campaignSeed);
  const [folderList, setFolderList] = useState<PortalFolder[]>(liveAuth ? [] : folderSeed);
  const [contentList, setContentList] = useState<PortalContent[]>(liveAuth ? [] : contentSeed);
  const [commentList, setCommentList] = useState<PortalComment[]>(liveAuth ? [] : commentSeed);
  const [activityList, setActivityList] = useState<PortalActivity[]>(liveAuth ? [] : activitySeed);
  const [selectedCompany, setSelectedCompany] = useState(liveAuth ? "" : campaignSeed[0].company);
  const [selectedCampaign, setSelectedCampaign] = useState(liveAuth ? "" : campaignSeed[0].name);
  const [selectedFolder, setSelectedFolder] = useState("All folders");
  const [activeItemId, setActiveItemId] = useState(liveAuth ? "" : contentSeed[0].id);
  const [activePlatform, setActivePlatform] = useState<Platform>("Instagram");
  const [activeView, setActiveView] = useState<View>(
    initialView ?? (initialCampaignId ? "Campaigns" : "Dashboard"),
  );
  const [uploadOpen, setUploadOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState(initialTalent ?? "");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [approvalPending, setApprovalPending] = useState(false);
  const [celebration, setCelebration] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [previewState, setPreviewState] = useState<{
    itemId: string;
    loading: boolean;
    url?: string;
  }>({ itemId: "", loading: false });
  const [workspaceLoading, setWorkspaceLoading] = useState(liveAuth);
  const [workspaceSyncing, setWorkspaceSyncing] = useState(liveAuth);
  const [roleSetupSaving, setRoleSetupSaving] = useState(false);
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [demoStateReady, setDemoStateReady] = useState(false);

  const projectId = initialCampaignId ?? null;
  const projectStage = initialStage ?? "campaign";
  const projectFolderId = initialFolderId ?? null;
  const routeActiveItemId = initialContentId ?? activeItemId;

  const applyWorkspacePayload = useCallback((payload: BootstrapPayload) => {
    setActivityList(payload.activity);
    setCampaignList(payload.campaigns);
    setCommentList(payload.comments);
    setContentList(syncCommentCounts(payload.contentItems, payload.comments));
    setFolderList(payload.folders);
    setSession((current) =>
      current
        ? {
            ...current,
            email: payload.profile.email,
            name: payload.profile.name,
            role: payload.profile.role,
            roleConfirmed: payload.profile.roleConfirmed,
          }
        : current,
    );

    const firstCampaign =
      payload.campaigns.find((campaign) => campaign.id === initialCampaignId) ??
      payload.campaigns[0];
    const firstContent =
      payload.contentItems.find((item) => item.id === initialContentId) ??
      payload.contentItems.find((item) => item.campaign === firstCampaign?.name) ??
      payload.contentItems[0];

    if (firstCampaign) {
      setSelectedCompany(firstCampaign.company);
      setSelectedCampaign(firstCampaign.name);
    }

    if (firstContent) {
      setActiveItemId(firstContent.id);
      setActivePlatform(firstContent.platform);
    }
  }, [initialCampaignId, initialContentId]);

  useEffect(() => {
    const storedState = liveAuth ? null : readDemoState();
    const timer = window.setTimeout(() => {
      if (storedState) {
        setCampaignList(storedState.campaigns);
        setFolderList(storedState.folders);
        setContentList(storedState.contentItems);
        setCommentList(storedState.comments);
        setActivityList(storedState.activity);
      }

      if (!liveAuth) {
        setSession(readDemoSession());
      }

      setDemoStateReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [liveAuth]);

  useEffect(() => {
    if (liveAuth || !demoStateReady) {
      return;
    }

    window.localStorage.setItem(
      "approveLyPortalState",
      JSON.stringify({
        activity: activityList,
        campaigns: campaignList,
        comments: commentList,
        contentItems: contentList,
        folders: folderList,
      } satisfies DemoPortalState),
    );
  }, [activityList, campaignList, commentList, contentList, demoStateReady, folderList, liveAuth]);

  useEffect(() => {
    if (!liveAuth) {
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
        roleConfirmed: undefined,
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
        roleConfirmed: undefined,
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [liveAuth]);

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
        setWorkspaceLoading(false);
        setWorkspaceSyncing(false);
        return;
      }

      const payload = (await response.json()) as BootstrapPayload & { mode: "share" };

      if (cancelled) {
        return;
      }

      setActivityList(payload.activity);
      setCampaignList(payload.campaigns);
      setCommentList(payload.comments);
      setContentList(syncCommentCounts(payload.contentItems, payload.comments));
      setFolderList(payload.folders);
      setSession({
        email: payload.profile.email,
        name: payload.profile.name,
        role: "Assistant",
        roleConfirmed: true,
      });

      const firstCampaign = payload.campaigns[0];
      const firstContent =
        payload.contentItems.find((item) => item.id === initialContentId) ?? payload.contentItems[0];

      if (firstCampaign) {
        setSelectedCompany(firstCampaign.company);
        setSelectedCampaign(firstCampaign.name);
      }

      if (firstContent) {
        setActiveItemId(firstContent.id);
        setActivePlatform(firstContent.platform);
      }
      setWorkspaceLoading(false);
      setWorkspaceSyncing(false);
    }

    void loadPublicShare();

    return () => {
      cancelled = true;
    };
  }, [initialContentId, session]);

  useEffect(() => {
    const accessToken = session?.accessToken;

    if (!accessToken) {
      return;
    }

    const liveAccessToken = accessToken;
    const workspaceEmail = session.email;
    const cachedWorkspace = readWorkspaceCache(workspaceEmail);
    let cancelled = false;

    if (cachedWorkspace) {
      window.queueMicrotask(() => {
        if (!cancelled) {
          applyWorkspacePayload(cachedWorkspace);
          setWorkspaceLoading(false);
        }
      });
    }

    async function loadLiveWorkspace() {
      try {
        const payload = await apiRequest<BootstrapPayload & { mode: "live" | "demo" }>(
          "/api/bootstrap",
          liveAccessToken,
        );

        if (cancelled) {
          return;
        }

        applyWorkspacePayload(payload);
        writeWorkspaceCache(workspaceEmail, payload);
        setWorkspaceLoading(false);
        setWorkspaceSyncing(false);
      } catch {
        if (!cancelled) {
          setSession((current) => current && { ...current, accessToken: undefined });
          setWorkspaceLoading(false);
          setWorkspaceSyncing(false);
        }
      }
    }

    void loadLiveWorkspace();

    return () => {
      cancelled = true;
    };
  }, [
    applyWorkspacePayload,
    initialCampaignId,
    initialContentId,
    session?.accessToken,
    session?.email,
    workspaceRefreshKey,
  ]);

  const notify = (message: string, tone: ToastTone = "success") => {
    const id = Date.now();
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 3600);
  };

  const triggerCelebration = () => {
    setCelebration(true);
    window.setTimeout(() => setCelebration(false), 2200);
  };

  const capabilities = session ? roleCapabilities[session.role] : roleCapabilities.Creative;
  const usesDemoAssignmentRules = !session?.accessToken && session?.role === "Approver";

  const companies = useMemo(() => {
    const availableCampaigns =
      usesDemoAssignmentRules
        ? campaignList.filter((campaign) =>
            capabilities.assignedCampaigns?.includes(campaign.name),
          )
        : campaignList;

    return Array.from(new Set(availableCampaigns.map((campaign) => campaign.company)));
  }, [campaignList, capabilities.assignedCampaigns, usesDemoAssignmentRules]);

  const visibleCampaigns = useMemo(() => {
    const byCompany = campaignList.filter((campaign) => campaign.company === selectedCompany);

    if (usesDemoAssignmentRules) {
      return byCompany.filter((campaign) =>
        capabilities.assignedCampaigns?.includes(campaign.name),
      );
    }

    return byCompany;
  }, [campaignList, capabilities.assignedCampaigns, selectedCompany, usesDemoAssignmentRules]);

  const accessibleCampaigns = useMemo(
    () =>
      campaignList.filter(
        (campaign) =>
          !usesDemoAssignmentRules ||
          capabilities.assignedCampaigns?.includes(campaign.name),
      ),
    [campaignList, capabilities.assignedCampaigns, usesDemoAssignmentRules],
  );

  const accessibleContent = useMemo(
    () =>
      contentList.filter(
        (item) =>
          !usesDemoAssignmentRules ||
          capabilities.assignedCampaigns?.includes(item.campaign),
      ),
    [capabilities.assignedCampaigns, contentList, usesDemoAssignmentRules],
  );

  const pendingContent = useMemo(
    () =>
      accessibleContent.filter((item) =>
        ["Submitted", "In Review", "Changes Requested"].includes(item.status),
      ),
    [accessibleContent],
  );

  const archivedContent = useMemo(
    () =>
      accessibleContent.filter(
        (item) => item.status === "Approved" || item.status === "Archive Scheduled",
      ),
    [accessibleContent],
  );

  const currentCampaign = visibleCampaigns.some(
    (campaign) => campaign.name === selectedCampaign,
  )
    ? selectedCampaign
    : visibleCampaigns[0]?.name ?? selectedCampaign;

  const currentProject = campaignList.find(
    (campaign) => campaign.id === (projectId ?? ""),
  );
  const isProjectPage = Boolean(projectId);

  const projectContent = useMemo(
    () =>
      accessibleContent.filter(
        (item) =>
          item.campaign === currentProject?.name && item.company === currentProject?.company,
      ),
    [accessibleContent, currentProject?.company, currentProject?.name],
  );

  const projectFolders = useMemo(
    () =>
      folderList.filter((folder) =>
        projectContent.some(
          (item) => item.folder === folder.name || item.folder.startsWith(`${folder.name} /`),
        ),
      ),
    [folderList, projectContent],
  );

  const routeContent = projectContent.find((item) => item.id === routeActiveItemId);
  const currentFolder =
    projectFolders.find((folder) => folder.id === projectFolderId) ??
    projectFolders.find((folder) => folder.name === selectedFolder) ??
    projectFolders.find(
      (folder) =>
        routeContent?.folder === folder.name || routeContent?.folder.startsWith(`${folder.name} /`),
    );

  const folderContent = useMemo(
    () =>
      projectContent.filter(
        (item) =>
          currentFolder &&
          (item.folder === currentFolder.name || item.folder.startsWith(`${currentFolder.name} /`)),
      ),
    [currentFolder, projectContent],
  );

  const firstCampaignForCompany = (company: string) => {
    const matches = campaignList.filter((campaign) => campaign.company === company);
    const allowed =
      usesDemoAssignmentRules
        ? matches.filter((campaign) =>
            capabilities.assignedCampaigns?.includes(campaign.name),
          )
        : matches;

    return allowed[0]?.name ?? selectedCampaign;
  };

  const activeItem =
    (isProjectPage ? projectContent : accessibleContent).find((item) => item.id === routeActiveItemId) ??
    projectContent[0] ??
    accessibleContent[0];
  const activeComments = activeItem
    ? commentList.filter((comment) => comment.contentId === activeItem.id)
    : [];

  useEffect(() => {
    let cancelled = false;

    if (!activeItem?.storageKey || activeItem.mediaUrl || !session?.accessToken) {
      return () => {
        cancelled = true;
      };
    }

    void apiRequest<{ downloadUrl?: string }>(
      `/api/content/${activeItem.id}/download?final=false`,
      session.accessToken,
    )
      .then((saved) => {
        if (!cancelled) {
          setPreviewState({
            itemId: activeItem.id,
            loading: false,
            url: saved.downloadUrl,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewState({ itemId: activeItem.id, loading: false });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewState((current) =>
            current.itemId === activeItem.id ? { ...current, loading: false } : current,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeItem?.id, activeItem?.mediaUrl, activeItem?.storageKey, session?.accessToken]);

  const previewUrl =
    activeItem?.mediaUrl ??
    (previewState.itemId === activeItem?.id ? previewState.url : undefined);
  const previewLoading = Boolean(
    activeItem?.storageKey &&
      !activeItem.mediaUrl &&
      (previewState.itemId !== activeItem.id || previewState.loading),
  );

  const metrics = useMemo(() => {
    const pending = accessibleContent.filter((item) =>
      ["Submitted", "In Review", "Changes Requested"].includes(item.status),
    ).length;
    const openComments = commentList.filter((comment) => comment.status === "Open").length;
    const approved = accessibleContent.filter((item) => item.status === "Approved").length;
    const storedItems = accessibleContent.filter((item) => item.storageKey);
    const storageBytes = storedItems.reduce((total, item) => total + sizeToBytes(item.size), 0);

    return [
      {
        detail: `${accessibleContent.length} visible across your workspace`,
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
        detail: storedItems.length
          ? `${storedItems.length} uploaded file${storedItems.length === 1 ? "" : "s"} tracked`
          : "No uploaded files tracked yet",
        icon: Database,
        label: "Storage used",
        tone: "red" as const,
        value: formatStorage(storageBytes),
      },
    ];
  }, [accessibleContent, commentList]);

  const talentContent = useMemo(
    () =>
      selectedTalent
        ? accessibleContent.filter((item) => talentFromTags(item.tags) === selectedTalent)
        : accessibleContent,
    [accessibleContent, selectedTalent],
  );

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

  const handleRoleSelection = async (role: Role) => {
    if (!session || roleSetupSaving) {
      return;
    }

    setRoleSetupSaving(true);

    if (session.accessToken) {
      const response = await callBackend<{ profile: Profile }>("/api/profile/role", {
        body: { role },
        method: "PATCH",
      });

      if (!response?.profile) {
        setRoleSetupSaving(false);
        return;
      }

      window.sessionStorage.removeItem(workspaceCacheKey(session.email));
      setSession((current) =>
        current
          ? {
              ...current,
              email: response.profile.email,
              name: response.profile.name,
              role: response.profile.role,
              roleConfirmed: response.profile.roleConfirmed,
            }
          : current,
      );
      setWorkspaceLoading(true);
      setWorkspaceSyncing(true);
      setWorkspaceRefreshKey((value) => value + 1);
      setActiveView(role === "Approver" ? "Content to approve" : "Dashboard");
      setRoleSetupSaving(false);
      router.replace("/dashboard");
      notify(`Workspace set up as ${role}`);
      return;
    }

    const nextSession = { ...session, role, roleConfirmed: true };
    window.sessionStorage.setItem("approveLyDemoSession", JSON.stringify(nextSession));
    setSession(nextSession);
    setActiveView(role === "Approver" ? "Content to approve" : "Dashboard");
    setRoleSetupSaving(false);
    router.replace("/dashboard");
    notify(`Workspace set up as ${role}`);
  };

  const handleLogin = (nextSession: Session) => {
    if (!liveAuth) {
      window.sessionStorage.setItem("approveLyDemoSession", JSON.stringify(nextSession));
    }

    setSession(nextSession);
    setWorkspaceLoading(Boolean(nextSession.accessToken));
    setWorkspaceSyncing(Boolean(nextSession.accessToken));
    setActiveView(initialCampaignId ? "Campaigns" : "Dashboard");
    const project = initialCampaignId
      ? campaignList.find((campaign) => campaign.id === initialCampaignId)
      : undefined;

    if (project) {
      setSelectedCompany(project.company);
      setSelectedCampaign(project.name);
    }
    notify(`Signed in as ${nextSession.name}`);
  };

  const handleLogout = () => {
    if (liveAuth) {
      void createBrowserSupabaseClient().auth.signOut();
      if (session?.email) {
        window.sessionStorage.removeItem(workspaceCacheKey(session.email));
      }
    }

    window.sessionStorage.removeItem("approveLyDemoSession");
    setSession(null);
    setWorkspaceLoading(false);
    setWorkspaceSyncing(false);
    notify("Signed out", "neutral");
  };

  const handleUpload = async (draft: UploadDraft) => {
    if (!requirePermission(capabilities.canCreate, "Assistant and Approver roles cannot upload.")) {
      return;
    }

    setUploadProgress({ label: "Preparing upload", value: 8 });
    let storageKey: string | undefined;

    if (draft.file && session?.accessToken) {
      setUploadProgress({ label: "Preparing secure file upload", value: 20 });
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

      setUploadProgress({ label: "Uploading file", value: 48 });
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

    setUploadProgress({ label: "Saving content details", value: 78 });
    const folderName = draft.folder.trim() || "Unsorted";
    const tags = buildContentTags(draft.tags, draft.talent);
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
      setUploadProgress({ label: "Upload complete", value: 100 });
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
      mediaUrl: "/demo/approval-preview.mp4",
    };

    setUploadProgress({ label: "Upload complete", value: 100 });
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
    if (!activeItem || approvalPending) {
      return;
    }

    if (!requirePermission(capabilities.canApprove, "Assistant view is read-only.")) {
      return;
    }

    if (activeItem.unresolved > 0) {
      notify("Resolve open comments before approval.", "warning");
      return;
    }

    setApprovalPending(true);

    try {
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
        triggerCelebration();
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
      triggerCelebration();
    } finally {
      setApprovalPending(false);
    }
  };

  const handleUnapprove = async () => {
    if (!activeItem || approvalPending) {
      return;
    }

    if (!requirePermission(capabilities.canUnapprove, "Assistant view is read-only.")) {
      return;
    }

    if (activeItem.status !== "Approved" && activeItem.status !== "Archive Scheduled") {
      notify("Only approved content can be unapproved.", "warning");
      return;
    }

    setApprovalPending(true);

    try {
      const saved = await callBackend<{ item: PortalContent }>(
        `/api/content/${activeItem.id}/unapprove`,
        {
          method: "POST",
        },
      );

      if (saved?.item) {
        setContentList((items) => replaceContentItem(items, saved.item));
        addActivity("bell", `${saved.item.title} unapproved`);
        notify(
          saved.item.status === "Changes Requested"
            ? "Approval removed; open comments still need attention"
            : "Approval removed and content returned to review",
          "warning",
        );
        return;
      }

      if (session?.accessToken) {
        return;
      }

      const nextStatus = activeItem.unresolved > 0 ? "Changes Requested" : "In Review";
      setContentList((items) =>
        items.map((item) =>
          item.id === activeItem.id
            ? {
                ...item,
                approvedAt: undefined,
                archiveDeleteAt: undefined,
                status: nextStatus,
              }
            : item,
        ),
      );
      addActivity("bell", `${activeItem.title} unapproved`);
      notify(
        nextStatus === "Changes Requested"
          ? "Approval removed; open comments still need attention"
          : "Approval removed and content returned to review",
        "warning",
      );
    } finally {
      setApprovalPending(false);
    }
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
    const bundle = projectContent.filter((item) => item.status === "Approved");

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

  const requestDelete = (target: DeleteTarget) => {
    if (!requirePermission(capabilities.canCreate, "Only Creatives can delete workspace items.")) {
      return;
    }

    setDeleteTarget(target);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const target = deleteTarget;

    if (target.kind === "folder") {
      const folder = folderList.find((item) => item.id === target.id);
      const hasContent = folder
        ? contentList.some(
            (item) => item.folder === folder.name || item.folder.startsWith(`${folder.name} /`),
          )
        : false;

      if (hasContent) {
        notify("Delete or move the content in this folder first.", "warning");
        return;
      }
    }

    const endpoint =
      target.kind === "content"
        ? `/api/content/${encodeURIComponent(target.id)}`
        : target.kind === "campaign"
          ? `/api/campaigns/${encodeURIComponent(target.id)}`
          : `/api/folders/${encodeURIComponent(target.id)}`;
    const saved = await callBackend<{ id: string }>(endpoint, { method: "DELETE" });

    if (session?.accessToken && !saved) {
      return;
    }

    if (target.kind === "content") {
      setContentList((items) => items.filter((item) => item.id !== target.id));
      setCommentList((items) => items.filter((comment) => comment.contentId !== target.id));
      addActivity("archive", `${target.label} deleted`);
    }

    if (target.kind === "campaign") {
      const campaign = campaignList.find((item) => item.id === target.id);
      setCampaignList((items) => items.filter((item) => item.id !== target.id));
      setContentList((items) =>
        items.filter(
          (item) => item.campaign !== campaign?.name || item.company !== campaign?.company,
        ),
      );
      setSelectedCampaign("");
      addActivity("archive", `${target.label} deleted`);
    }

    if (target.kind === "folder") {
      setFolderList((items) => items.filter((item) => item.id !== target.id));
      addActivity("archive", `${target.label} folder deleted`);
    }

    setDeleteTarget(null);
    notify(`${target.label} deleted`, "neutral");
    setActiveView("Campaigns");
    router.push(target.kind === "campaign" ? "/campaigns" : projectId ? `/campaigns/${encodeURIComponent(projectId)}` : "/campaigns");
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

  const openProject = (campaign: PortalCampaign) => {
    if (workspaceLoading && !campaignList.length) {
      notify("Workspace is still syncing. Try again in a moment.", "neutral");
      return;
    }

    setActiveView("Campaigns");
    setSelectedCompany(campaign.company);
    setSelectedCampaign(campaign.name);
    setSelectedFolder("All folders");
    router.push(`/campaigns/${encodeURIComponent(campaign.id)}`);
  };

  const openFolder = (folder: PortalFolder) => {
    if (!projectId) {
      return;
    }

    setSelectedFolder(folder.name);
    router.push(`/campaigns/${encodeURIComponent(projectId)}/folders/${encodeURIComponent(folder.id)}`);
  };

  const openApproval = (item: PortalContent) => {
    if (!projectId) {
      return;
    }

    setActiveItemId(item.id);
    setActivePlatform(item.platform);
    router.push(`/campaigns/${encodeURIComponent(projectId)}/content/${encodeURIComponent(item.id)}`);
  };

  const moveApproval = (direction: "next" | "previous") => {
    const index = projectContent.findIndex((item) => item.id === routeActiveItemId);
    const nextIndex = direction === "next" ? index + 1 : index - 1;
    const nextItem = projectContent[nextIndex];

    if (nextItem) {
      openApproval(nextItem);
    }
  };

  const navigateToView = (view: View) => {
    setActiveView(view);
    router.push(viewRoutes[view]);
  };

  const openTalent = (talent: string) => {
    setSelectedTalent(talent);
    setActiveView("Talent content");
    router.push(`/talent?name=${encodeURIComponent(talent)}`);
  };

  const showAllTalentContent = () => {
    setSelectedTalent("");
    setActiveView("Talent content");
    router.push("/talent");
  };

  const openActivity = (activity: PortalActivity) => {
    const related = accessibleContent.find(
      (item) =>
        activity.title.includes(item.id) ||
        activity.title.toLowerCase().includes(item.title.toLowerCase()),
    );

    if (related) {
      openContent(related);
      return;
    }

    if (activity.kind === "archive") {
      navigateToView("Archive");
      return;
    }

    if (activity.kind === "comment") {
      navigateToView("Comments received");
      return;
    }

    navigateToView(session?.role === "Approver" ? "Content to approve" : "Campaigns");
  };

  const openContent = (item: PortalContent) => {
    const campaign = accessibleCampaigns.find(
      (candidate) => candidate.name === item.campaign && candidate.company === item.company,
    );

    if (!campaign) {
      notify("This content is not assigned to your workspace.", "warning");
      return;
    }

    setSelectedCompany(campaign.company);
    setSelectedCampaign(campaign.name);
    setActiveItemId(item.id);
    setActivePlatform(item.platform);
    router.push(`/campaigns/${encodeURIComponent(campaign.id)}/content/${encodeURIComponent(item.id)}`);
  };

  const closeProject = () => {
    setActiveView("Dashboard");
    router.push(viewRoutes.Dashboard);
  };

  const backToCampaign = () => {
    if (!projectId) {
      return;
    }

    setSelectedFolder("All folders");
    router.push(`/campaigns/${encodeURIComponent(projectId)}`);
  };

  const backToFolder = () => {
    if (!projectId || !currentFolder) {
      return;
    }

    router.push(
      `/campaigns/${encodeURIComponent(projectId)}/folders/${encodeURIComponent(currentFolder.id)}`,
    );
  };

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (session.roleConfirmed === false) {
    return (
      <RoleSetupScreen
        name={session.name}
        onSubmit={(role) => void handleRoleSelection(role)}
        saving={roleSetupSaving}
      />
    );
  }

  if (liveAuth && session.accessToken && session.roleConfirmed === undefined) {
    return <RoleSetupLoadingScreen name={session.name} />;
  }

  return (
    <main className="min-h-screen scroll-pb-28 bg-[#f7f7f4] pb-28 text-zinc-950 lg:pb-0">
      <div
        aria-busy={workspaceSyncing}
        className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-3 py-3 sm:px-5 lg:flex-row lg:p-5"
      >
        <Sidebar
          activeView={activeView}
          onChangeView={navigateToView}
          demoMode={!liveAuth}
          onLogout={handleLogout}
          onReset={resetDemo}
          role={session.role}
          storageValue={metrics[3].value}
        />
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          {isProjectPage ? (
            <>
              {projectStage === "content" ? (
                <>
                  <ApprovalHeader
                    campaign={currentProject ?? visibleCampaigns[0]}
                    folder={currentFolder}
                    item={activeItem}
                    onBack={backToFolder}
                  />
          <ApprovalWorkspace
                    activeComments={activeComments}
                    activeItem={activeItem}
                    activePlatform={activePlatform}
                    activityList={activityList}
                    canArchive={capabilities.canArchive}
                    canApprove={capabilities.canApprove}
                    canUnapprove={capabilities.canUnapprove}
                    canComment={capabilities.canComment}
                    focused
                    hasNextItem={Boolean(projectContent[projectContent.findIndex((item) => item.id === routeActiveItemId) + 1])}
                    hasPreviousItem={Boolean(projectContent[projectContent.findIndex((item) => item.id === routeActiveItemId) - 1])}
                    onAddComment={() => {
                      if (requirePermission(capabilities.canComment, "Assistant view is read-only.")) {
                        setCommentOpen(true);
                      }
                    }}
                    onApprove={handleApprove}
                    onArchive={handleArchive}
                    onBundleDownload={handleBundleDownload}
                    onDownload={handleDownload}
                    onNextItem={() => moveApproval("next")}
                    onPlatformChange={setActivePlatform}
                    onPreviousItem={() => moveApproval("previous")}
                    onResolveComment={handleResolveComment}
                    onShare={() => setShareOpen(true)}
                    onUnapprove={handleUnapprove}
                    onDelete={
                      capabilities.canCreate
                        ? () =>
                            requestDelete({
                              id: activeItem?.id ?? routeActiveItemId,
                              kind: "content",
                              label: activeItem?.title ?? "content",
                            })
                        : undefined
                    }
                    approvalPending={approvalPending}
                    previewLoading={previewLoading}
                    previewUrl={previewUrl}
                  />
                </>
              ) : (
                <>
                  <ProjectHeader
                    canCreate={capabilities.canCreate}
                    campaign={currentProject ?? visibleCampaigns[0]}
                    contentItems={projectContent}
                    name={session.name}
                    onDelete={
                      capabilities.canCreate && currentProject
                        ? () =>
                            requestDelete({
                              id: currentProject.id,
                              kind: "campaign",
                              label: currentProject.name,
                            })
                        : undefined
                    }
                    onBack={projectStage === "folder" ? backToCampaign : closeProject}
                    onNewUpload={() => {
                      if (requirePermission(capabilities.canCreate, "Only Creatives can upload.")) {
                        setUploadOpen(true);
                      }
                    }}
                    role={session.role}
                  />
                  {projectStage === "campaign" ? (
                    <CampaignOverviewPage
                      canCreate={capabilities.canCreate}
                      campaign={currentProject ?? visibleCampaigns[0]}
                      contentItems={projectContent}
                      folders={projectFolders}
                      onAddFolder={() => {
                        if (requirePermission(capabilities.canCreate, "Only Creatives can create folders.")) {
                          setFolderOpen(true);
                        }
                      }}
                      onDelete={
                        capabilities.canCreate && currentProject
                          ? () =>
                              requestDelete({
                                id: currentProject.id,
                                kind: "campaign",
                                label: currentProject.name,
                              })
                          : undefined
                      }
                      onOpenFolder={openFolder}
                      onUpload={() => {
                        if (requirePermission(capabilities.canCreate, "Only Creatives can upload.")) {
                          setUploadOpen(true);
                        }
                      }}
                    />
                  ) : (
                    <FolderContentPage
                      campaign={currentProject ?? visibleCampaigns[0]}
                      folder={currentFolder}
                      items={folderContent}
                      onBack={backToCampaign}
                      onDeleteFolder={
                        capabilities.canCreate && currentFolder
                          ? () =>
                              requestDelete({
                                id: currentFolder.id,
                                kind: "folder",
                                label: currentFolder.name,
                              })
                          : undefined
                      }
                      onDownload={handleDownload}
                      onMore={(item) => {
                        setActiveItemId(item.id);
                        setShareOpen(true);
                      }}
                      onDelete={
                        capabilities.canCreate
                          ? (item) => requestDelete({ id: item.id, kind: "content", label: item.title })
                          : undefined
                      }
                      onOpenItem={openApproval}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {activeView === "Dashboard" ? (
                <>
                  <DashboardHeader
                    canCreate={capabilities.canCreate}
                    companies={companies}
                    name={session.name}
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
                    role={session.role}
                    selectedCompany={selectedCompany}
                  />
                  <DashboardGrid metrics={metrics} />
                  <DashboardStatusOverview
                    contentItems={accessibleContent}
                    onOpenTalent={openTalent}
                    onOpenView={navigateToView}
                    onShowAllContent={showAllTalentContent}
                    role={session.role}
                  />
                  <DashboardHome
                    activeView="Dashboard"
                    campaigns={visibleCampaigns}
                    canCreate={capabilities.canCreate}
                    onAddCampaign={() => {
                      if (requirePermission(capabilities.canCreate, "Only Creatives can create campaigns.")) {
                        setCampaignOpen(true);
                      }
                    }}
                    onOpenCampaign={openProject}
                    onOpenActivity={openActivity}
                    recentActivity={activityList}
                  />
                </>
              ) : null}
              {activeView === "Campaigns" ? (
                <CampaignsPage
                  campaigns={accessibleCampaigns}
                  canCreate={capabilities.canCreate}
                  onAddCampaign={() => {
                    if (requirePermission(capabilities.canCreate, "Only Creatives can create campaigns.")) {
                      setCampaignOpen(true);
                    }
                  }}
                  onOpenCampaign={openProject}
                  role={session.role}
                />
              ) : null}
              {activeView === "Comments received" ? (
                <CommentsReceivedPage
                  comments={commentList.filter((comment) =>
                    accessibleContent.some((item) => item.id === comment.contentId),
                  )}
                  contentItems={accessibleContent}
                  onOpenContent={openContent}
                />
              ) : null}
              {activeView === "Content to approve" ? (
                <ContentListPage
                  description="Assigned content ready for review, comments, or one-click approval."
                  emptyTitle="Nothing waiting for approval"
                  items={pendingContent}
                  onDownload={handleDownload}
                  onDelete={
                    capabilities.canCreate
                      ? (item) => requestDelete({ id: item.id, kind: "content", label: item.title })
                      : undefined
                  }
                  onMore={(item) => {
                    setActiveItemId(item.id);
                    setShareOpen(true);
                  }}
                  onSelect={openContent}
                  title="Content to approve"
                />
              ) : null}
              {activeView === "Archive" ? (
                <ContentListPage
                  description="Download approved work or open a campaign to review its archive status."
                  emptyTitle="Nothing archived yet"
                  items={archivedContent}
                  onDownload={(item) => handleDownload(item, true)}
                  onDelete={
                    capabilities.canCreate
                      ? (item) => requestDelete({ id: item.id, kind: "content", label: item.title })
                      : undefined
                  }
                  onMore={(item) => {
                    setActiveItemId(item.id);
                    setShareOpen(true);
                  }}
                  onSelect={openContent}
                  title="Archive"
                />
              ) : null}
              {activeView === "Team" ? (
                <TeamPage
                  campaigns={accessibleCampaigns}
                  contentItems={accessibleContent}
                  name={session.name}
                  role={session.role}
                  onOpenCampaign={openProject}
                />
              ) : null}
              {activeView === "Talent content" ? (
                <ContentListPage
                  action={
                    <button
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold transition hover:border-zinc-400"
                      onClick={showAllTalentContent}
                      type="button"
                    >
                      <Users aria-hidden className="size-4" />
                      Show all content
                    </button>
                  }
                  description={
                    selectedTalent
                      ? `Every content item tagged to ${selectedTalent}.`
                      : "Every content item with talent labels across your workspace."
                  }
                  emptyTitle={selectedTalent ? `No content for ${selectedTalent}` : "No content yet"}
                  items={talentContent}
                  onDownload={handleDownload}
                  onDelete={
                    capabilities.canCreate
                      ? (item) => requestDelete({ id: item.id, kind: "content", label: item.title })
                      : undefined
                  }
                  onMore={(item) => {
                    setActiveItemId(item.id);
                    setShareOpen(true);
                  }}
                  onSelect={openContent}
                  title={selectedTalent ? `${selectedTalent} content` : "All talent content"}
                />
              ) : null}
            </>
          )}
        </section>
      </div>

      <ToastStack toasts={toasts} />

      {workspaceSyncing ? <WorkspaceSyncToast /> : null}
      {celebration ? <ConfettiBurst /> : null}

      {uploadOpen ? (
        <UploadModal
          defaultFolder={selectedFolder === "All folders" ? defaultUploadDraft.folder : selectedFolder}
          folders={folderList}
          onClose={() => setUploadOpen(false)}
          progress={uploadProgress}
          onSubmit={(draft) => {
            void handleUpload(draft).finally(() => {
              setUploadOpen(false);
              setUploadProgress(null);
            });
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
      {deleteTarget ? (
        <DeleteModal
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
          target={deleteTarget}
        />
      ) : null}
    </main>
  );
}

const roleSetupOptions: Array<{
  role: Role;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    role: "Creative",
    label: "Creative",
    description: "Create campaigns, upload content, and manage your projects.",
    icon: Upload,
  },
  {
    role: "Approver",
    label: "Approver",
    description: "Review assigned campaigns, comment, request changes, and approve.",
    icon: Check,
  },
  {
    role: "Assistant",
    label: "Assistant",
    description: "View assigned work and download approved content.",
    icon: Eye,
  },
];

function RoleSetupScreen({
  name,
  onSubmit,
  saving,
}: {
  name: string;
  onSubmit: (role: Role) => void;
  saving: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState<Role>("Creative");

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f4] px-4 py-8 text-zinc-950 sm:px-6">
      <section className="w-full max-w-xl rounded-lg border border-[#dedbd2] bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
            A
          </div>
          <div>
            <p className="text-base font-semibold">Approve.ly</p>
            <p className="text-sm text-zinc-500">One last step before your workspace</p>
          </div>
        </div>

        <div className="mt-10">
          <p className="text-sm font-semibold text-emerald-700">Welcome, {name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            What is your role?
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Choose the view that matches how you work. You can start using the portal as soon as you continue.
          </p>
        </div>

        <div className="mt-7 grid gap-3">
          {roleSetupOptions.map((option) => {
            const Icon = option.icon;
            const selected = selectedRole === option.role;

            return (
              <button
                aria-pressed={selected}
                className={`flex min-h-20 items-center gap-4 rounded-md border p-4 text-left transition ${
                  selected
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                }`}
                disabled={saving}
                key={option.role}
                onClick={() => setSelectedRole(option.role)}
                type="button"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-md ${
                    selected ? "bg-white/15" : "bg-zinc-100"
                  }`}
                >
                  <Icon aria-hidden className={`size-5 ${selected ? "text-white" : "text-zinc-700"}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className={`mt-1 block text-xs leading-5 ${selected ? "text-zinc-300" : "text-zinc-500"}`}>
                    {option.description}
                  </span>
                </span>
                {selected ? <CheckCircle2 aria-hidden className="ml-auto size-5 shrink-0" /> : null}
              </button>
            );
          })}
        </div>

        <button
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
          disabled={saving}
          onClick={() => onSubmit(selectedRole)}
          type="button"
        >
          {saving ? "Setting up your workspace..." : "Continue to workspace"}
          {!saving ? <ChevronRight aria-hidden className="size-4" /> : null}
        </button>
      </section>
    </main>
  );
}

function RoleSetupLoadingScreen({ name }: { name: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f4] px-4 py-8 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-[#dedbd2] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid size-11 place-items-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
          A
        </div>
        <p className="mt-5 text-sm font-semibold text-emerald-700">Welcome, {name}</p>
        <h1 className="mt-2 text-2xl font-semibold">Preparing your workspace</h1>
        <p className="mt-2 text-sm text-zinc-500">We are checking your account setup.</p>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-600" />
        </div>
      </section>
    </main>
  );
}

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("Carlo");
  const [email, setEmail] = useState("creative@approvely.app");
  const [password, setPassword] = useState("approval");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const liveAuth = isSupabaseBrowserConfigured();
  const isSignUp = mode === "sign-up";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setAuthMessage("");

    if (isSignUp) {
      if (name.trim().length < 2) {
        setError("Enter your name so your team can identify you.");
        return;
      }
      if (password.length < 8) {
        setError("Use a password with at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setAuthLoading(true);

    if (liveAuth) {
      const supabase = createBrowserSupabaseClient();
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          },
          password,
        });

        if (signUpError) {
          setAuthLoading(false);
          setError(signUpError.message);
          return;
        }

        if (!data.session?.access_token || !data.user?.email) {
          setAuthLoading(false);
          setAuthMessage("Account created. Check your email to confirm your address, then sign in.");
          setMode("sign-in");
          setPassword("");
          setConfirmPassword("");
          return;
        }

        setAuthLoading(false);
        onLogin({
          accessToken: data.session.access_token,
          email: data.user.email,
          name:
            typeof data.user.user_metadata?.name === "string"
              ? data.user.user_metadata.name
              : name.trim() || data.user.email,
          role: "Creative",
          roleConfirmed: false,
        });
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError || !data.session?.access_token || !data.user.email) {
        setAuthLoading(false);
        setError(signInError?.message ?? "Sign in failed.");
        return;
      }

      setAuthLoading(false);
      onLogin({
        accessToken: data.session.access_token,
        email: data.user.email,
        name:
          typeof data.user.user_metadata?.name === "string"
            ? data.user.user_metadata.name
            : name.trim() || data.user.email,
        role: "Creative",
        roleConfirmed: undefined,
      });
      return;
    }

    setAuthLoading(false);
    onLogin({
      email,
      name: name.trim() || email.split("@")[0] || "User",
      role: "Creative",
      roleConfirmed: false,
    });
  };

  const startGoogleSignIn = async () => {
    if (!liveAuth) {
      onLogin({
        email: "google.user@approvely.app",
        name: "Google User",
        role: "Creative",
        roleConfirmed: false,
      });
      return;
    }

    setGoogleLoading(true);
    setError("");
    setAuthMessage("");
    const { error: oauthError } = await createBrowserSupabaseClient().auth.signInWithOAuth({
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
      provider: "google",
    });

    if (oauthError) {
      setGoogleLoading(false);
      setError(`Google sign-in is not ready: ${oauthError.message}`);
    }
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
          <h2 className="text-xl font-semibold">{isSignUp ? "Create your account" : "Sign in"}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {liveAuth
              ? isSignUp
                ? "Create a secure workspace account with email or Google."
                : "Use your email/password or continue with Google."
              : "Demo mode is active until Supabase env vars are added."}
          </p>
        </div>
        {error ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            {error}
          </div>
        ) : null}
        {authMessage ? (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
            {authMessage}
          </div>
        ) : null}
        <form className="grid gap-3" onSubmit={submit}>
          {isSignUp || !liveAuth ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Name
              <input
                autoComplete="name"
                className="h-11 rounded-md border border-zinc-200 px-3 outline-none transition focus:border-zinc-400"
                onChange={(event) => setName(event.target.value)}
                required={isSignUp}
                value={name}
              />
            </label>
          ) : null}
          <label className="grid gap-1.5 text-sm font-medium">
            Email
            <input
              autoComplete="email"
              className="h-11 rounded-md border border-zinc-200 px-3 outline-none transition focus:border-zinc-400"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Password
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="h-11 rounded-md border border-zinc-200 px-3 outline-none transition focus:border-zinc-400"
              onChange={(event) => setPassword(event.target.value)}
              minLength={isSignUp ? 8 : undefined}
              required
              type="password"
              value={password}
            />
          </label>
          {isSignUp ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Confirm password
              <input
                autoComplete="new-password"
                className="h-11 rounded-md border border-zinc-200 px-3 outline-none transition focus:border-zinc-400"
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
          ) : null}
          <button
            className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            disabled={authLoading}
            type="submit"
          >
            <LockKeyhole aria-hidden className="size-4" />
            {authLoading ? (isSignUp ? "Creating account..." : "Signing in...") : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>
        <button
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold transition hover:border-zinc-300"
          disabled={googleLoading}
          onClick={() => void startGoogleSignIn()}
          type="button"
        >
          <ShieldCheck aria-hidden className="size-4" />
          {googleLoading ? "Opening Google..." : "Continue with Google"}
        </button>
        <div className="mt-5 flex items-center justify-center gap-1 text-sm text-zinc-500">
          <span>{isSignUp ? "Already have an account?" : "New to Approve.ly?"}</span>
          <button
            className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950"
            onClick={() => {
              setMode(isSignUp ? "sign-in" : "sign-up");
              setError("");
              setAuthMessage("");
            }}
            type="button"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </div>
      </section>
    </main>
  );
}

function DashboardHeader({
  canCreate,
  companies,
  name,
  onCompanyChange,
  onNewUpload,
  role,
  selectedCompany,
}: {
  canCreate: boolean;
  companies: string[];
  name: string;
  onCompanyChange: (company: string) => void;
  onNewUpload: () => void;
  role: Role;
  selectedCompany: string;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium text-emerald-700">Workspace overview</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Welcome, {name}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
          Keep every campaign moving from first upload to final download.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{role} workspace</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SelectField
            icon={Building2}
            label="Company"
            onChange={onCompanyChange}
            options={companies}
            value={selectedCompany}
          />
          {canCreate ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              onClick={onNewUpload}
              type="button"
            >
              <Plus aria-hidden className="size-4" />
              New upload
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function ProjectHeader({
  canCreate,
  campaign,
  contentItems,
  name,
  onDelete,
  onBack,
  onNewUpload,
  role,
}: {
  canCreate: boolean;
  campaign?: PortalCampaign;
  contentItems: PortalContent[];
  name: string;
  onDelete?: () => void;
  onBack: () => void;
  onNewUpload: () => void;
  role: Role;
}) {
  const videoItems = contentItems.filter((item) => item.type === "Video");
  const statusBreakdown: Array<{ label: string; status: Status; count: number }> = [
    { count: videoItems.filter((item) => item.status === "Submitted").length, label: "Submitted", status: "Submitted" },
    { count: videoItems.filter((item) => item.status === "In Review").length, label: "In review", status: "In Review" },
    { count: videoItems.filter((item) => item.status === "Changes Requested").length, label: "Changes", status: "Changes Requested" },
    { count: videoItems.filter((item) => ["Approved", "Archive Scheduled"].includes(item.status)).length, label: "Approved", status: "Approved" },
  ];

  return (
    <header className="border-b border-zinc-200 pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-950"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft aria-hidden className="size-4" />
            All projects
          </button>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-500">{campaign?.company ?? "Project"}</span>
            <span className="text-zinc-300">/</span>
            <span className="text-sm font-medium text-zinc-500">{role} workspace</span>
          </div>
          <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            {campaign?.name ?? "Project workspace"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {campaign?.due ? `Due ${campaign.due}` : "Review and approve campaign content"} · Signed in as {name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {campaign ? <CampaignStatusBadge status={campaign.status} /> : null}
          {onDelete ? <IconButton label="Delete campaign" icon={Trash2} onClick={onDelete} /> : null}
          {canCreate ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              onClick={onNewUpload}
              type="button"
            >
              <Plus aria-hidden className="size-4" />
              Upload
            </button>
          ) : null}
        </div>
      </div>
      {campaign ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)] lg:items-center lg:gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-500">
              <span>Project progress</span>
              <span>{campaign.progress}%</span>
            </div>
            <ProgressBar value={campaign.progress} className="mt-2" />
          </div>
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-500">
              <span>Total videos</span>
              <span className="text-base text-zinc-950">{videoItems.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {statusBreakdown.map((entry) => (
                <span
                  className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${statusStyles[entry.status]}`}
                  key={entry.label}
                >
                  {entry.label} {entry.count}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">{campaign.approvers}</p>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function CampaignOverviewPage({
  canCreate,
  campaign,
  contentItems,
  folders,
  onAddFolder,
  onDelete,
  onOpenFolder,
  onUpload,
}: {
  canCreate: boolean;
  campaign?: PortalCampaign;
  contentItems: PortalContent[];
  folders: PortalFolder[];
  onAddFolder: () => void;
  onDelete?: () => void;
  onOpenFolder: (folder: PortalFolder) => void;
  onUpload: () => void;
}) {
  const pending = contentItems.filter((item) =>
    ["Submitted", "In Review", "Changes Requested"].includes(item.status),
  ).length;
  const approved = contentItems.filter((item) =>
    ["Approved", "Archive Scheduled"].includes(item.status),
  ).length;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
      <Panel
        title="Folders"
        action={
          <div className="flex items-center gap-2">
            {canCreate ? <IconButton label="Add folder" icon={FolderPlus} onClick={onAddFolder} /> : null}
            {canCreate ? <IconButton label="Upload content" icon={Upload} onClick={onUpload} /> : null}
            {onDelete ? <IconButton label="Delete campaign" icon={Trash2} onClick={onDelete} /> : null}
          </div>
        }
      >
        {folders.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {folders.map((folder) => {
              const count = contentItems.filter(
                (item) => item.folder === folder.name || item.folder.startsWith(`${folder.name} /`),
              ).length;

              return (
                <button
                  className="group flex min-h-28 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-sm"
                  key={folder.id}
                  onClick={() => onOpenFolder(folder)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">
                      <Folder aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-zinc-950">{folder.name}</span>
                      <span className="mt-1 block text-xs text-zinc-500">{count} content item{count === 1 ? "" : "s"}</span>
                    </span>
                  </span>
                  <ArrowUpRight aria-hidden className="size-4 shrink-0 text-zinc-400 transition group-hover:text-zinc-950" />
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Folder} title="No folders yet" />
        )}
      </Panel>

      <Panel title="Campaign status">
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <MiniStat label="Content items" value={String(contentItems.length)} />
          <MiniStat label="Awaiting approval" value={String(pending)} />
          <MiniStat label="Approved" value={String(approved)} />
        </div>
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>{campaign?.name ?? "Campaign"}</span>
            <span>{campaign?.progress ?? 0}%</span>
          </div>
          <ProgressBar value={campaign?.progress ?? 0} className="mt-3" />
          <p className="mt-2 text-xs text-zinc-500">Due {campaign?.due ?? "No due date"}</p>
        </div>
      </Panel>
    </section>
  );
}

function FolderContentPage({
  campaign,
  folder,
  items,
  onBack,
  onDelete,
  onDeleteFolder,
  onDownload,
  onMore,
  onOpenItem,
}: {
  campaign?: PortalCampaign;
  folder?: PortalFolder;
  items: PortalContent[];
  onBack: () => void;
  onDelete?: (item: PortalContent) => void;
  onDeleteFolder?: () => void;
  onDownload: (item: PortalContent) => void;
  onMore: (item: PortalContent) => void;
  onOpenItem: (item: PortalContent) => void;
}) {
  return (
    <>
      <PageIntro
        action={
          <div className="flex items-center gap-2">
            {onDeleteFolder ? <IconButton label="Delete folder" icon={Trash2} onClick={onDeleteFolder} /> : null}
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft aria-hidden className="size-4" />
              Campaign folders
            </button>
          </div>
        }
        description={`${campaign?.name ?? "Campaign"} / ${folder?.name ?? "Folder"}`}
        eyebrow="Folder contents"
        title={folder?.name ?? "Folder"}
      />
      <Panel title={`${items.length} content item${items.length === 1 ? "" : "s"}`}>
        {items.length ? (
          <div className="grid gap-3">
            {items.map((item) => (
              <ContentCard
                active={false}
                item={item}
                key={item.id}
                onDelete={onDelete ? () => onDelete(item) : undefined}
                onDownload={() => onDownload(item)}
                onMore={() => onMore(item)}
                onSelect={() => onOpenItem(item)}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={FileStack} title="No content in this folder" />
        )}
      </Panel>
    </>
  );
}

function ApprovalHeader({
  campaign,
  folder,
  item,
  onBack,
}: {
  campaign?: PortalCampaign;
  folder?: PortalFolder;
  item?: PortalContent;
  onBack: () => void;
}) {
  return (
    <header className="border-b border-zinc-200 pb-5">
      <button
        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-950"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {folder?.name ?? "Folder contents"}
      </button>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <span>{campaign?.company ?? "Campaign"}</span>
        <span className="text-zinc-300">/</span>
        <span>{campaign?.name ?? "Campaign"}</span>
        <span className="text-zinc-300">/</span>
        <span>{folder?.name ?? item?.folder ?? "Content"}</span>
      </div>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            {item?.title ?? "Approval review"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">{item?.id ?? "Select content to review"}</p>
        </div>
        {item ? <StatusBadge status={item.status} /> : null}
      </div>
    </header>
  );
}

function WorkspaceSyncToast() {
  return (
    <div className="fixed bottom-24 right-3 z-50 w-[min(360px,calc(100vw-24px))] rounded-lg border border-blue-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:bottom-3" role="status">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
        <Clock3 aria-hidden className="size-4 animate-pulse" />
        Syncing workspace data
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-label="Syncing workspace">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" />
      </div>
    </div>
  );
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 28 }, (_, index) => index);

  return (
    <div aria-label="Approval celebration" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" role="status">
      {pieces.map((piece) => (
        <span
          className="absolute left-1/2 top-1/3 size-2 animate-[confetti_2.1s_ease-out_forwards] rounded-sm"
          key={piece}
          style={{
            backgroundColor: ["#2563eb", "#db2777", "#f59e0b", "#059669", "#7c3aed"][piece % 5],
            transform: `rotate(${piece * 31}deg)`,
            animationDelay: `${(piece % 7) * 35}ms`,
            left: `${8 + ((piece * 17) % 84)}%`,
          }}
        />
      ))}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-lg">
        Approved
      </div>
    </div>
  );
}

function DeleteModal({
  onClose,
  onConfirm,
  target,
}: {
  onClose: () => void;
  onConfirm: () => void;
  target: DeleteTarget;
}) {
  return (
    <Modal onClose={onClose} title={`Delete ${target.kind}`}>
      <div className="grid gap-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-900">
          This permanently deletes <strong>{target.label}</strong>. Stored media and related comments cannot be recovered.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-red-700 px-3 text-sm font-semibold text-white transition hover:bg-red-800"
            onClick={onConfirm}
            type="button"
          >
            <Trash2 aria-hidden className="size-4" />
            Delete permanently
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DashboardHome({
  activeView,
  campaigns,
  canCreate,
  onAddCampaign,
  onOpenActivity,
  onOpenCampaign,
  recentActivity,
}: {
  activeView: View;
  campaigns: PortalCampaign[];
  canCreate: boolean;
  onAddCampaign: () => void;
  onOpenActivity: (activity: PortalActivity) => void;
  onOpenCampaign: (campaign: PortalCampaign) => void;
  recentActivity: PortalActivity[];
}) {
  const heading = activeView === "Dashboard" ? "Your projects" : activeView;
  const supportingCopy =
    activeView === "Dashboard"
      ? "Open a project to review its content, comments, and approvals."
      : "Choose a project to continue working in its focused workspace.";

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Panel
        title={heading}
        action={
          canCreate ? (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            onClick={onAddCampaign}
            type="button"
          >
            <Plus aria-hidden className="size-4" />
            New project
          </button>
          ) : null
        }
      >
        <p className="mb-4 text-sm text-zinc-600">{supportingCopy}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              className="group rounded-lg border border-zinc-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-sm"
              onClick={() => onOpenCampaign(campaign)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-zinc-950">{campaign.name}</p>
                  <p className="mt-1 truncate text-sm text-zinc-500">{campaign.company}</p>
                </div>
                <ArrowUpRight aria-hidden className="size-4 text-zinc-400 transition group-hover:text-zinc-950" />
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 text-sm text-zinc-600">
                <span>{campaign.due}</span>
                <CampaignStatusBadge status={campaign.status} />
              </div>
              <ProgressBar value={campaign.progress} className="mt-3" />
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                <span>{campaign.progress}% complete</span>
                <span>{campaign.approvers}</span>
              </div>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Recent activity">
        <ActivityFeed items={recentActivity.slice(0, 5)} onSelect={onOpenActivity} />
      </Panel>
    </section>
  );
}

function PageIntro({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-emerald-700">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

function CampaignsPage({
  campaigns,
  canCreate,
  onAddCampaign,
  onOpenCampaign,
  role,
}: {
  campaigns: PortalCampaign[];
  canCreate: boolean;
  onAddCampaign: () => void;
  onOpenCampaign: (campaign: PortalCampaign) => void;
  role: Role;
}) {
  return (
    <>
      <PageIntro
        action={
          canCreate ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              onClick={onAddCampaign}
              type="button"
            >
              <Plus aria-hidden className="size-4" />
              New project
            </button>
          ) : null
        }
        description={
          role === "Approver"
            ? "Open an assigned campaign to review its content and approval status."
            : "Browse every company campaign and open a focused workspace when you are ready to work."
        }
        eyebrow="Project directory"
        title="Campaigns"
      />
      <Panel title={`${campaigns.length} project${campaigns.length === 1 ? "" : "s"}`}>
        {campaigns.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                className="group rounded-lg border border-zinc-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-sm"
                onClick={() => onOpenCampaign(campaign)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-zinc-950">{campaign.name}</p>
                    <p className="mt-1 truncate text-sm text-zinc-500">{campaign.company}</p>
                  </div>
                  <ArrowUpRight aria-hidden className="size-4 shrink-0 text-zinc-400 transition group-hover:text-zinc-950" />
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 text-sm text-zinc-600">
                  <span>{campaign.due}</span>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
                <ProgressBar value={campaign.progress} className="mt-3" />
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span>{campaign.progress}% complete</span>
                  <span>{campaign.approvers}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState icon={Folder} title="No campaigns assigned" />
        )}
      </Panel>
    </>
  );
}

function ContentListPage({
  action,
  description,
  emptyTitle,
  items,
  onDelete,
  onDownload,
  onMore,
  onSelect,
  title,
}: {
  action?: ReactNode;
  description: string;
  emptyTitle: string;
  items: PortalContent[];
  onDelete?: (item: PortalContent) => void;
  onDownload: (item: PortalContent) => void;
  onMore: (item: PortalContent) => void;
  onSelect: (item: PortalContent) => void;
  title: string;
}) {
  return (
    <>
      <PageIntro
        action={action}
        description={description}
        eyebrow="Content operations"
        title={title}
      />
      <Panel
        title={`${items.length} item${items.length === 1 ? "" : "s"}`}
      >
        {items.length ? (
          <div className="grid gap-3">
            {items.map((item) => (
              <ContentCard
                active={false}
                item={item}
                key={item.id}
                onDelete={onDelete ? () => onDelete(item) : undefined}
                onDownload={() => onDownload(item)}
                onMore={() => onMore(item)}
                onSelect={() => onSelect(item)}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={title === "Archive" ? Archive : Inbox} title={emptyTitle} />
        )}
      </Panel>
    </>
  );
}

function CommentsReceivedPage({
  comments,
  contentItems,
  onOpenContent,
}: {
  comments: PortalComment[];
  contentItems: PortalContent[];
  onOpenContent: (item: PortalContent) => void;
}) {
  const contentById = new Map(contentItems.map((item) => [item.id, item]));

  return (
    <>
      <PageIntro
        description="A focused summary of messages, anchors, and unresolved review notes received from your team."
        eyebrow="Content operations"
        title="Comments received"
      />
      <Panel title={`${comments.length} message${comments.length === 1 ? "" : "s"}`}>
        {comments.length ? (
          <div className="grid gap-3">
            {comments.map((comment) => {
              const item = contentById.get(comment.contentId);

              return (
                <article className="rounded-lg border border-zinc-200 bg-white p-4" key={comment.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <MessageSquareText aria-hidden className="size-4 text-zinc-500" />
                        <p className="text-sm font-semibold text-zinc-950">{comment.author}</p>
                        <span className="text-xs text-zinc-500">{comment.role}</span>
                        <span className={comment.status === "Open" ? "rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800" : "rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"}>
                          {comment.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-zinc-700">{comment.body}</p>
                      <p className="mt-2 text-xs font-semibold text-zinc-500">{comment.anchor}</p>
                    </div>
                    {item ? (
                      <button
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold transition hover:border-zinc-400"
                        onClick={() => onOpenContent(item)}
                        type="button"
                      >
                        <ArrowUpRight aria-hidden className="size-4" />
                        Open content
                      </button>
                    ) : null}
                  </div>
                  {item ? <p className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500">{item.title} · {item.id}</p> : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={MessageSquareText} title="No comments received" />
        )}
      </Panel>
    </>
  );
}

function TeamPage({
  campaigns,
  contentItems,
  name,
  onOpenCampaign,
  role,
}: {
  campaigns: PortalCampaign[];
  contentItems: PortalContent[];
  name: string;
  onOpenCampaign: (campaign: PortalCampaign) => void;
  role: Role;
}) {
  const capabilities = roleCapabilities[role];
  const pending = contentItems.filter((item) =>
    ["Submitted", "In Review", "Changes Requested"].includes(item.status),
  ).length;
  const approved = contentItems.filter((item) => item.status === "Approved").length;

  return (
    <>
      <PageIntro
        description="See your access level, assigned work, and the campaigns currently in your workspace."
        eyebrow="Workspace access"
        title="Team"
      />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Panel title="Your access">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
                {name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-950">{name}</p>
                <p className="text-sm text-zinc-500">{role}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <AccessRow label="Create content" enabled={capabilities.canCreate} />
              <AccessRow label="Approve content" enabled={capabilities.canApprove} />
              <AccessRow label="Comment on content" enabled={capabilities.canComment} />
              <AccessRow label="Schedule archive" enabled={capabilities.canArchive} />
            </div>
          </div>
        </Panel>
        <Panel title="Workspace snapshot">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Assigned campaigns" value={String(campaigns.length)} />
            <MiniStat label="Awaiting review" value={String(pending)} />
            <MiniStat label="Approved" value={String(approved)} />
          </div>
          <div className="mt-4 grid gap-2">
            {campaigns.map((campaign) => (
              <button
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-400"
                key={campaign.id}
                onClick={() => onOpenCampaign(campaign)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{campaign.name}</span>
                  <span className="mt-1 block truncate text-xs text-zinc-500">{campaign.company} / {campaign.due}</span>
                </span>
                <ArrowUpRight aria-hidden className="size-4 shrink-0 text-zinc-400" />
              </button>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}

function AccessRow({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
      <span className="text-zinc-700">{label}</span>
      <span className={enabled ? "text-emerald-700" : "text-zinc-400"}>{enabled ? "Enabled" : "View only"}</span>
    </div>
  );
}

function Sidebar({
  activeView,
  demoMode,
  onChangeView,
  onLogout,
  onReset,
  role,
  storageValue,
}: {
  activeView: View;
  demoMode: boolean;
  onChangeView: (view: View) => void;
  onLogout: () => void;
  onReset: () => void;
  role: Role;
  storageValue: string;
}) {
  const navItems: { label: View; icon: LucideIcon }[] =
    role === "Approver"
      ? [
          { label: "Dashboard", icon: Gauge },
          { label: "Content to approve", icon: CheckCircle2 },
        ]
      : role === "Assistant"
        ? [
            { label: "Dashboard", icon: Gauge },
            { label: "Campaigns", icon: Folder },
            { label: "Comments received", icon: MessageSquareText },
            { label: "Archive", icon: Archive },
          ]
        : [
            { label: "Dashboard", icon: Gauge },
            { label: "Campaigns", icon: Folder },
            { label: "Comments received", icon: MessageSquareText },
            { label: "Archive", icon: Archive },
            { label: "Team", icon: Users },
          ];

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 rounded-[1.1rem] border border-zinc-200/90 bg-white/90 p-3 shadow-sm backdrop-blur-xl lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-[0.8rem] bg-zinc-950 text-xs font-semibold text-white">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Approve.ly</p>
            <p className="truncate text-xs text-zinc-500">{role} workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {demoMode ? (
            <button
              aria-label="Reset demo"
              className="grid size-10 place-items-center rounded-[0.8rem] text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 active:scale-95"
              onClick={onReset}
              title="Reset demo"
              type="button"
            >
              <Database aria-hidden className="size-4" />
            </button>
          ) : null}
          <button
            aria-label="Sign out"
            className="grid size-10 place-items-center rounded-[0.8rem] text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 active:scale-95"
            onClick={onLogout}
            title="Sign out"
            type="button"
          >
            <LogOut aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      <aside className="hidden shrink-0 flex-col gap-3 rounded-lg border border-[#dedbd2] bg-white p-3 shadow-sm lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-40px)] lg:w-64">
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

      <nav className="grid gap-1" aria-label="Primary">
        {navItems.map((item) => (
          <button
            aria-label={item.label}
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
        <p className="mt-2 text-xs leading-5 text-emerald-800">
          Tracked Supabase uploads. Approved files can be downloaded and marked for archive.
        </p>
      </div>

      <div className={`grid gap-2 ${demoMode ? "grid-cols-2 lg:grid-cols-1" : "grid-cols-1"}`}>
        {demoMode ? (
          <button
            aria-label="Reset demo"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            onClick={onReset}
            type="button"
          >
            <Database aria-hidden className="size-4" />
            <span className="hidden lg:inline">Reset demo</span>
          </button>
        ) : null}
        <button
          aria-label="Sign out"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
          onClick={onLogout}
          type="button"
        >
          <LogOut aria-hidden className="size-4" />
          <span className="hidden lg:inline">Sign out</span>
        </button>
      </div>
      </aside>

      <nav
        aria-label="Mobile primary"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pt-2 lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-xl items-center gap-1 rounded-[1.35rem] border border-zinc-200/90 bg-white/90 p-1.5 shadow-[0_-12px_34px_rgba(24,24,27,0.12)] backdrop-blur-xl">
          {navItems.map((item) => {
            const active = activeView === item.label;

            return (
              <button
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`mobile-nav-item group relative flex min-h-[3.65rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 text-[0.68rem] font-semibold transition-[background-color,color,box-shadow,transform] duration-300 active:scale-95 ${
                  active
                    ? "mobile-nav-active bg-zinc-950 text-white shadow-[0_7px_18px_rgba(24,24,27,0.22)]"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
                key={item.label}
                onClick={() => onChangeView(item.label)}
                type="button"
              >
                <item.icon
                  aria-hidden
                  className={`size-5 transition-transform duration-300 ${active ? "scale-110" : "group-hover:-translate-y-0.5"}`}
                />
                <span className="max-w-full truncate leading-none">{mobileNavLabel(item.label)}</span>
                {active ? <span aria-hidden className="absolute -bottom-0.5 size-1 rounded-full bg-emerald-400" /> : null}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function mobileNavLabel(label: View) {
  switch (label) {
    case "Comments received":
      return "Notes";
    case "Content to approve":
      return "Review";
    case "Campaigns":
      return "Work";
    case "Dashboard":
      return "Home";
    default:
      return label;
  }
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

function DashboardStatusOverview({
  contentItems,
  onOpenTalent,
  onOpenView,
  onShowAllContent,
  role,
}: {
  contentItems: PortalContent[];
  onOpenTalent: (talent: string) => void;
  onOpenView: (view: View) => void;
  onShowAllContent: () => void;
  role: Role;
}) {
  const groups: {
    color: string;
    description: string;
    label: string;
    statuses: Status[];
    view: View;
  }[] = [
    {
      color: "#2563eb",
      description: "Submitted or being reviewed",
      label: "In review",
      statuses: ["Submitted", "In Review"],
      view: role === "Approver" ? "Content to approve" : "Campaigns",
    },
    {
      color: "#f59e0b",
      description: "Needs a creative update",
      label: "Needs changes",
      statuses: ["Changes Requested"],
      view: role === "Approver" ? "Content to approve" : "Comments received",
    },
    {
      color: "#059669",
      description: "Ready to download",
      label: "Approved",
      statuses: ["Approved"],
      view: "Archive",
    },
    {
      color: "#ea580c",
      description: "Held for archive",
      label: "Archive queued",
      statuses: ["Archive Scheduled"],
      view: "Archive",
    },
  ];
  const total = contentItems.length;
  const groupCounts = groups.map((group) =>
    contentItems.filter((item) => group.statuses.includes(item.status)).length,
  );
  const completeCount = contentItems.filter((item) =>
    ["Approved", "Archive Scheduled"].includes(item.status),
  ).length;
  const completionRate = total ? Math.round((completeCount / total) * 100) : 0;
  const talentCounts = Array.from(
    contentItems.reduce((counts, item) => {
      const talent = talentFromTags(item.tags);

      if (talent) {
        counts.set(talent, (counts.get(talent) ?? 0) + 1);
      }

      return counts;
    }, new Map<string, number>()),
  )
    .sort(([, countA], [, countB]) => countB - countA);
  const maxTalentCount = Math.max(1, ...talentCounts.map(([, count]) => count));

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
      <Panel
        title="Workflow pulse"
        action={
          <span className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
            {completionRate}% complete
          </span>
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold text-zinc-950">{completeCount} of {total}</p>
            <p className="text-xs text-zinc-500">content complete</p>
          </div>
          <span className="text-xs font-semibold text-zinc-500">Hover a colour for detail</span>
        </div>
        <div aria-label="Workflow status breakdown" className="mt-5 flex h-7 overflow-visible rounded-full bg-zinc-100">
          {groups.map((group, index) => {
            const count = groupCounts[index];
            const width = total ? (count / total) * 100 : 0;

            return (
              <button
                aria-label={`${group.label}: ${count} item${count === 1 ? "" : "s"}`}
                className="group relative h-full min-w-0 transition hover:brightness-110 disabled:cursor-default"
                disabled={count === 0}
                key={group.label}
                onClick={() => onOpenView(group.view)}
                style={{ backgroundColor: group.color, width: `${width}%` }}
                title={`${group.label}: ${count}`}
                type="button"
              >
                {count > 0 ? (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-950 px-2 py-1 text-[11px] font-semibold text-white shadow-sm group-hover:block group-focus-visible:block">
                    {group.label}: {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {groups.map((group, index) => (
            <button
              className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-left transition hover:border-zinc-400 disabled:cursor-default disabled:hover:border-zinc-200"
              disabled={groupCounts[index] === 0}
              key={group.label}
              onClick={() => onOpenView(group.view)}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-zinc-900">{group.label}</span>
                  <span className="block truncate text-[11px] text-zinc-500">{group.description}</span>
                </span>
              </span>
              <span className="text-sm font-semibold text-zinc-950">{groupCounts[index]}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="Talent coverage"
        action={
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
            onClick={onShowAllContent}
            type="button"
          >
            <Users aria-hidden className="size-3.5" />
            Show all content
          </button>
        }
      >
        {talentCounts.length ? (
          <div className="grid gap-3">
            {talentCounts.map(([name, count], index) => (
              <button
                className="flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-2 text-left transition hover:border-zinc-200 hover:bg-zinc-50"
                key={name}
                onClick={() => onOpenTalent(name)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: ["#0f766e", "#7c3aed", "#c2410c", "#2563eb"][index % 4] }}>
                    {initials(name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-zinc-900">{name}</span>
                    <span className="block text-xs text-zinc-500">{count} content item{count === 1 ? "" : "s"}</span>
                  </span>
                </span>
                <span className="h-2 w-20 overflow-hidden rounded-full bg-zinc-100">
                  <span className="block h-full rounded-full bg-zinc-950" style={{ width: `${Math.max(20, (count / maxTalentCount) * 100)}%` }} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center">
            <div>
              <Users aria-hidden className="mx-auto size-6 text-zinc-500" />
              <p className="mt-2 text-sm font-semibold text-zinc-700">No talent tags yet</p>
              <button
                className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold"
                onClick={onShowAllContent}
                type="button"
              >
                Show all content
              </button>
            </div>
          </div>
        )}
      </Panel>
    </section>
  );
}

function ContentCard({
  active,
  item,
  onDelete,
  onDownload,
  onMore,
  onSelect,
}: {
  active: boolean;
  item: PortalContent;
  onDelete?: () => void;
  onDownload: () => void;
  onMore: () => void;
  onSelect: () => void;
}) {
  const talent = talentFromTags(item.tags);

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
        {talent ? <TalentBadge name={talent} /> : null}
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
          {onDelete ? <IconButton label="Delete content" icon={Trash2} onClick={onDelete} /> : null}
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

function TalentBadge({ name }: { name: string }) {
  return (
    <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800">
      <Users aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}

function ApprovalWorkspace({
  activeComments,
  activeItem,
  activePlatform,
  activityList,
  approvalPending,
  canArchive,
  canApprove,
  canUnapprove,
  canComment,
  focused = false,
  hasNextItem,
  hasPreviousItem,
  onAddComment,
  onApprove,
  onArchive,
  onBundleDownload,
  onDownload,
  onNextItem,
  onPlatformChange,
  onPreviousItem,
  onResolveComment,
  onShare,
  onUnapprove,
  onDelete,
  previewLoading,
  previewUrl,
}: {
  activeComments: PortalComment[];
  activeItem?: PortalContent;
  activePlatform: Platform;
  activityList: PortalActivity[];
  approvalPending: boolean;
  canArchive: boolean;
  canApprove: boolean;
  canUnapprove: boolean;
  canComment: boolean;
  focused?: boolean;
  hasNextItem: boolean;
  hasPreviousItem: boolean;
  onAddComment: () => void;
  onApprove: () => void;
  onArchive: (item: PortalContent) => void;
  onBundleDownload: () => void;
  onDownload: (item: PortalContent, final?: boolean) => void;
  onNextItem: () => void;
  onPlatformChange: (platform: Platform) => void;
  onPreviousItem: () => void;
  onResolveComment: (commentId: string) => void;
  onShare: () => void;
  onUnapprove: () => void;
  onDelete?: () => void;
  previewLoading: boolean;
  previewUrl?: string;
}) {
  const touchStartX = useRef<number | null>(null);

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
    <section
      className="flex min-w-0 flex-col gap-4"
      onTouchEnd={(event) => {
        if (touchStartX.current === null) {
          return;
        }

        const startX = touchStartX.current;
        const currentX = event.changedTouches[0]?.clientX;
        touchStartX.current = null;

        if (startX === null || currentX === undefined) {
          return;
        }

        const distance = currentX - startX;

        if (Math.abs(distance) < 60) {
          return;
        }

        if (distance < 0 && hasNextItem) {
          onNextItem();
        }
        if (distance > 0 && hasPreviousItem) {
          onPreviousItem();
        }
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
    >
      <Panel
        title="Approval review"
        action={
          <div className="flex items-center gap-2">
            <IconButton label="Private link" icon={LockKeyhole} onClick={onShare} />
            <IconButton label="Share" icon={Share2} onClick={onShare} />
            {onDelete ? <IconButton label="Delete content" icon={Trash2} onClick={onDelete} /> : null}
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.92fr)_minmax(260px,1fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(260px,0.92fr)_minmax(260px,1fr)]">
          <PlatformPreview
            item={activeItem}
            key={activeItem.id}
            platform={activePlatform}
            onPlatformChange={onPlatformChange}
            previewLoading={previewLoading}
            previewUrl={previewUrl}
          />
          <ReviewPanel
            approvalPending={approvalPending}
            canApprove={canApprove}
            canUnapprove={canUnapprove}
            canComment={canComment}
            comments={activeComments}
            item={activeItem}
            onAddComment={onAddComment}
            onApprove={onApprove}
            hasNextItem={hasNextItem}
            hasPreviousItem={hasPreviousItem}
            onNextItem={onNextItem}
            onPreviousItem={onPreviousItem}
            onResolveComment={onResolveComment}
            onUnapprove={onUnapprove}
          />
        </div>
      </Panel>
      {!focused ? (
        <>
          <ArchivePanel
            canArchive={canArchive}
            item={activeItem}
            onArchive={() => onArchive(activeItem)}
            onBundleDownload={onBundleDownload}
            onFinalDownload={() => onDownload(activeItem, true)}
          />
          <ActivityPanel activityList={activityList} />
        </>
      ) : null}
    </section>
  );
}

function PlatformPreview({
  item,
  onPlatformChange,
  platform,
  previewLoading,
  previewUrl,
}: {
  item: PortalContent;
  onPlatformChange: (platform: Platform) => void;
  platform: Platform;
  previewLoading: boolean;
  previewUrl?: string;
}) {
  const tabs: Platform[] = ["Instagram", "TikTok", "YouTube Shorts"];
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideoPreview = Boolean(
    previewUrl &&
      (item.type === "Video" ||
        item.mimeType?.startsWith("video/") ||
        /\.(mp4|mov|webm)(?:\?|$)/i.test(previewUrl)),
  );

  const togglePlayback = () => {
    if (!isVideoPreview) {
      return;
    }

    if (!videoRef.current) {
      setPlaying((value) => !value);
      return;
    }

    if (videoRef.current.paused) {
      void videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

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
          {previewUrl && isVideoPreview ? (
            <video
              className="absolute inset-0 z-[1] size-full object-cover"
              loop
              muted
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              playsInline
              preload="metadata"
              ref={videoRef}
              src={previewUrl}
            />
          ) : previewUrl ? (
            <Image
              alt={`${item.title} preview`}
              className="object-cover"
              fill
              sizes="330px"
              src={previewUrl}
              unoptimized
            />
          ) : null}
          {previewLoading ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-zinc-950/70 text-sm font-semibold text-white">
              Loading preview...
            </div>
          ) : null}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 text-xs font-semibold">
            <span>9:41</span>
            <span className="rounded-md bg-black/35 px-2 py-1">{platformLabel(platform)}</span>
          </div>
          <div className="absolute inset-x-8 top-20 bottom-28 z-10 rounded-md border border-white/35" />
          <div className="absolute bottom-5 left-4 right-16 z-10">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-md bg-white text-xs font-bold text-zinc-950">
                {item.company.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-semibold">{platformHandle(platform)}</span>
            </div>
            <p className="mt-3 text-sm leading-5">{item.title}</p>
            <p className="mt-2 text-xs text-white/80">{item.campaign} / {item.version}</p>
          </div>
          <div className="absolute bottom-7 right-3 z-10 flex flex-col gap-4">
            <PreviewIcon icon={Check} label={platform === "Instagram" ? "12k" : platform === "TikTok" ? "88k" : "6.4k"} />
            <PreviewIcon icon={MessageCircle} label={String(item.comments)} />
            <PreviewIcon icon={Send} label="Share" />
          </div>
          {isVideoPreview ? (
            <button
              aria-label="Play preview"
              className="absolute left-1/2 top-1/2 z-20 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md bg-white/20 backdrop-blur transition hover:bg-white/30"
              onClick={togglePlayback}
              type="button"
            >
              {playing ? <Check aria-hidden className="size-7 text-white" /> : <Play aria-hidden className="size-7 fill-white text-white" />}
            </button>
          ) : null}
          <div className="absolute left-[42%] top-[47%] z-10 size-5 rounded-md border-2 border-amber-300 bg-amber-300/20" />
          <div className="absolute left-[58%] top-[36%] z-10 h-12 w-16 rounded-md border-2 border-blue-300 bg-blue-300/15" />
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
  approvalPending,
  canApprove,
  canUnapprove,
  canComment,
  comments,
  hasNextItem,
  hasPreviousItem,
  item,
  onAddComment,
  onApprove,
  onNextItem,
  onPreviousItem,
  onResolveComment,
  onUnapprove,
}: {
  approvalPending: boolean;
  canApprove: boolean;
  canUnapprove: boolean;
  canComment: boolean;
  comments: PortalComment[];
  hasNextItem: boolean;
  hasPreviousItem: boolean;
  item: PortalContent;
  onAddComment: () => void;
  onApprove: () => void;
  onNextItem: () => void;
  onPreviousItem: () => void;
  onResolveComment: (commentId: string) => void;
  onUnapprove: () => void;
}) {
  const talent = talentFromTags(item.tags);
  const approvalBlocked = item.unresolved > 0;
  const isApproved = item.status === "Approved" || item.status === "Archive Scheduled";

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

      {talent ? <TalentBadge name={talent} /> : null}

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

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          aria-label="Previous content"
          className="inline-flex h-11 items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!hasPreviousItem}
          onClick={onPreviousItem}
          type="button"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Previous
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:opacity-50"
          disabled={!canComment}
          onClick={onAddComment}
          type="button"
        >
          <MessageCircle aria-hidden className="size-4" />
          Comment
        </button>
        {isApproved ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 transition hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canUnapprove || approvalPending}
            onClick={onUnapprove}
            type="button"
          >
            {approvalPending ? <Clock3 aria-hidden className="size-4 animate-spin" /> : <Undo2 aria-hidden className="size-4" />}
            {approvalPending ? "Updating..." : "Unapprove"}
          </button>
        ) : (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-600"
            disabled={!canApprove || approvalPending || approvalBlocked}
            onClick={onApprove}
            type="button"
          >
            {approvalPending ? <Clock3 aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
            {approvalPending
              ? "Approving..."
              : approvalBlocked
                ? `Resolve ${item.unresolved} comment${item.unresolved === 1 ? "" : "s"}`
                : "Approve"}
          </button>
        )}
        <button
          aria-label="Next content"
          className="inline-flex h-11 items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!hasNextItem}
          onClick={onNextItem}
          type="button"
        >
          Next
          <ChevronRight aria-hidden className="size-4" />
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

function ActivityFeed({
  items,
  onSelect,
}: {
  items: PortalActivity[];
  onSelect?: (activity: PortalActivity) => void;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item) => {
        const Icon = activityIcons[item.kind];

        const content = (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">
              <Icon aria-hidden className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-zinc-500">{item.meta}</p>
            </div>
          </>
        );

        return onSelect ? (
          <button
            className="flex min-w-0 w-full items-center gap-3 rounded-md border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-400 hover:bg-zinc-50"
            key={item.id}
            onClick={() => onSelect(item)}
            type="button"
          >
            {content}
          </button>
        ) : (
          <div key={item.id} className="flex min-w-0 w-full items-center gap-3 rounded-md border border-zinc-200 bg-white p-3">
            {content}
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
    <section className="min-w-0 rounded-lg border border-[#dedbd2] bg-white p-3 shadow-sm sm:p-4">
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

function CampaignStatusBadge({ status }: { status: string }) {
  const styles =
    status === "Active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "Review"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
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
  progress,
}: {
  defaultFolder: string;
  folders: PortalFolder[];
  onClose: () => void;
  onSubmit: (draft: UploadDraft) => void;
  progress: UploadProgress | null;
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
          label="Talent / influencer"
          onChange={(value) => setDraft((item) => ({ ...item, talent: value }))}
          placeholder="e.g. Amelia Rose"
          value={draft.talent}
        />
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
        {progress ? (
          <div className="rounded-md border border-blue-100 bg-blue-50 p-3" role="status">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-blue-900">
              <span>{progress.label}</span>
              <span>{progress.value}%</span>
            </div>
            <div
              aria-label="Upload progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress.value}
              className="mt-2 h-2 overflow-hidden rounded-full bg-white"
              role="progressbar"
            >
              <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${progress.value}%` }} />
            </div>
          </div>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold"
            disabled={Boolean(progress)}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white"
            disabled={Boolean(progress)}
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

function readDemoSession(): Session | null {
  if (typeof window === "undefined" || isSupabaseBrowserConfigured()) {
    return null;
  }

  const storedSession = window.sessionStorage.getItem("approveLyDemoSession");

  if (!storedSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedSession) as Session;
    return { ...parsed, roleConfirmed: parsed.roleConfirmed ?? true };
  } catch {
    window.sessionStorage.removeItem("approveLyDemoSession");
    return null;
  }
}

function readDemoState(): DemoPortalState | null {
  if (typeof window === "undefined" || isSupabaseBrowserConfigured()) {
    return null;
  }

  const storedState = window.localStorage.getItem("approveLyPortalState");

  if (!storedState) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedState) as Partial<DemoPortalState>;

    if (
      !Array.isArray(parsed.activity) ||
      !Array.isArray(parsed.campaigns) ||
      !Array.isArray(parsed.comments) ||
      !Array.isArray(parsed.contentItems) ||
      !Array.isArray(parsed.folders)
    ) {
      return null;
    }

    return parsed as DemoPortalState;
  } catch {
    window.localStorage.removeItem("approveLyPortalState");
    return null;
  }
}

const workspaceCacheTtlMs = 10 * 60 * 1000;

function workspaceCacheKey(email: string) {
  return `approveLyWorkspaceCache:${email.trim().toLowerCase()}`;
}

function readWorkspaceCache(email: string): BootstrapPayload | null {
  if (typeof window === "undefined" || !email) {
    return null;
  }

  const storedWorkspace = window.sessionStorage.getItem(workspaceCacheKey(email));

  if (!storedWorkspace) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedWorkspace) as {
      payload?: BootstrapPayload;
      savedAt?: number;
    };

    if (
      !parsed.payload ||
      !Array.isArray(parsed.payload.activity) ||
      !Array.isArray(parsed.payload.campaigns) ||
      !Array.isArray(parsed.payload.comments) ||
      !Array.isArray(parsed.payload.contentItems) ||
      !Array.isArray(parsed.payload.folders) ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > workspaceCacheTtlMs
    ) {
      window.sessionStorage.removeItem(workspaceCacheKey(email));
      return null;
    }

    return parsed.payload;
  } catch {
    window.sessionStorage.removeItem(workspaceCacheKey(email));
    return null;
  }
}

function writeWorkspaceCache(email: string, payload: BootstrapPayload) {
  if (typeof window === "undefined" || !email) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      workspaceCacheKey(email),
      JSON.stringify({ payload, savedAt: Date.now() }),
    );
  } catch {
    // Session storage can be unavailable or full; live sync remains authoritative.
  }
}

function syncCommentCounts(items: PortalContent[], comments: PortalComment[]) {
  const counts = new Map<string, { total: number; unresolved: number }>();

  for (const comment of comments) {
    const count = counts.get(comment.contentId) ?? { total: 0, unresolved: 0 };
    count.total += 1;
    count.unresolved += comment.status === "Open" ? 1 : 0;
    counts.set(comment.contentId, count);
  }

  return items.map((item) => {
    const count = counts.get(item.id) ?? { total: 0, unresolved: 0 };

    return {
      ...item,
      comments: count.total,
      unresolved: count.unresolved,
    };
  });
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

function buildContentTags(rawTags: string, talent: string) {
  const parsedTags = rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const embeddedTalent = parsedTags.find((tag) => tag.toLowerCase().startsWith("talent:"));
  const talentName = talent.trim() || embeddedTalent?.slice("talent:".length).trim();
  const tags = parsedTags.filter((tag) => !tag.toLowerCase().startsWith("talent:"));

  return talentName ? [...tags, `talent:${talentName}`] : tags;
}

function talentFromTags(tags: string[]) {
  const talentTag = tags.find((tag) => tag.toLowerCase().startsWith("talent:"));
  const name = talentTag?.slice("talent:".length).trim();

  return name || undefined;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function sizeToBytes(size: string) {
  const value = Number.parseFloat(size);

  if (Number.isNaN(value)) {
    return 0;
  }

  const normalized = size.toLowerCase();

  if (normalized.includes("gb")) {
    return value * 1024 * 1024 * 1024;
  }

  if (normalized.includes("mb")) {
    return value * 1024 * 1024;
  }

  if (normalized.includes("kb")) {
    return value * 1024;
  }

  return value;
}

function formatStorage(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }

  return "0MB";
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
