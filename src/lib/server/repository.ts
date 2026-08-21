import { randomUUID } from "node:crypto";
import { getAppBaseUrl, isR2Configured } from "./env";
import { ApiError } from "./http";
import { assertCanApprove, assertCanArchive, assertCanComment, assertCanCreate } from "./permissions";
import { createDownloadUrl } from "./r2";
import { getSupabaseAdmin } from "./supabase";
import type {
  BootstrapPayload,
  CreateContentInput,
  PortalActivity,
  PortalCampaign,
  PortalComment,
  PortalContent,
  PortalFolder,
  Profile,
} from "./types";
import { platformAccent } from "./demo-data";

type CompanyRow = {
  id: string;
  name: string;
};

type CampaignRow = {
  id: string;
  company_id: string;
  name: string;
  due_label: string | null;
  status: string | null;
  progress: number | null;
};

type FolderRow = {
  id: string;
  campaign_id: string;
  name: string;
};

type ContentRow = {
  accent: string | null;
  approved_at: string | null;
  archive_delete_at: string | null;
  campaign_id: string;
  comments_count: number | null;
  content_type: PortalContent["type"];
  due_label: string | null;
  file_name: string | null;
  folder: string | null;
  id: string;
  mime_type: string | null;
  owner_name: string | null;
  platform: PortalContent["platform"];
  progress: number | null;
  share_mode: "Private" | "Public" | null;
  size_label: string | null;
  status: PortalContent["status"];
  storage_key: string | null;
  tags: string[] | null;
  title: string;
  unresolved_count: number | null;
  version: string | null;
};

type CommentRow = {
  anchor: string | null;
  author_name: string | null;
  body: string;
  content_id: string;
  id: string;
  role: string | null;
  status: "Open" | "Resolved";
};

type ActivityRow = {
  id: string;
  kind: PortalActivity["kind"] | null;
  meta: string | null;
  title: string;
};

export async function getBootstrap(profile: Profile): Promise<BootstrapPayload> {
  const supabase = getSupabaseAdmin();
  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id,name")
    .order("name");

  if (companyError) {
    throw new ApiError(companyError.message, 500);
  }

  const { data: campaigns, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,company_id,name,due_label,status,progress")
    .order("created_at", { ascending: false });

  if (campaignError) {
    throw new ApiError(campaignError.message, 500);
  }

  const visibleCampaignIds = await getVisibleCampaignIds(profile, campaigns ?? []);
  const visibleCampaigns = (campaigns ?? []).filter((campaign) =>
    visibleCampaignIds.has(campaign.id),
  );
  const visibleCampaignIdList = visibleCampaigns.map((campaign) => campaign.id);

  const [folders, contentItems, comments, activity] = await Promise.all([
    loadFolders(visibleCampaignIdList),
    loadContentItems(visibleCampaignIdList),
    loadComments(visibleCampaignIdList),
    loadActivity(),
  ]);

  const companyMap = new Map((companies ?? []).map((company) => [company.id, company.name]));
  const campaignMap = new Map(visibleCampaigns.map((campaign) => [campaign.id, campaign]));

  return {
    activity,
    campaigns: visibleCampaigns.map((campaign) => mapCampaign(campaign, companyMap)),
    comments,
    contentItems: contentItems.map((item) => mapContent(item, campaignMap, companyMap)),
    folders,
    profile,
  };
}

export async function getSharedBootstrap(token: string, profile?: Profile): Promise<BootstrapPayload> {
  const supabase = getSupabaseAdmin();
  const { data: shareLink, error: shareError } = await supabase
    .from("share_links")
    .select("content_id,mode")
    .eq("token", token)
    .single();

  if (shareError || !shareLink) {
    throw new ApiError("Share link not found.", 404);
  }

  if (shareLink.mode === "Private" && !profile) {
    throw new ApiError("This private link requires sign in.", 401);
  }

  const content = await getContentRow(shareLink.content_id);
  const item = await mapContentWithLookups(content);
  const { data: commentRows, error: commentError } = await supabase
    .from("content_comments")
    .select("id,content_id,author_name,role,anchor,body,status")
    .eq("content_id", content.id)
    .order("created_at", { ascending: false });

  if (commentError) {
    throw new ApiError(commentError.message, 500);
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,company_id,name,due_label,status,progress")
    .eq("id", content.campaign_id)
    .single();

  if (campaignError) {
    throw new ApiError(campaignError.message, 500);
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id,name")
    .eq("id", campaign.company_id)
    .single();

  if (companyError) {
    throw new ApiError(companyError.message, 500);
  }

  return {
    activity: [
      {
        id: `share-${token}`,
        kind: "share",
        meta: shareLink.mode,
        title: `${item.title} opened from share link`,
      },
    ],
    campaigns: [mapCampaign(campaign, new Map([[company.id, company.name]]))],
    comments: ((commentRows ?? []) as CommentRow[]).map(mapComment),
    contentItems: [item],
    folders: [
      {
        count: 1,
        id: `share-folder-${content.id}`,
        name: item.folder,
      },
    ],
    profile:
      profile ??
      ({
        email: "public-share@approve.ly",
        id: "public-share",
        name: "Public viewer",
        role: "Assistant",
      } satisfies Profile),
  };
}

export async function createCampaign(profile: Profile, input: {
  company: string;
  due: string;
  name: string;
}) {
  assertCanCreate(profile);

  const supabase = getSupabaseAdmin();
  const company = await findOrCreateCompany(input.company);
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      company_id: company.id,
      created_by: profile.id,
      due_label: input.due,
      name: input.name,
      progress: 0,
      status: "Planning",
    })
    .select("id,company_id,name,due_label,status,progress")
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  await logActivity("bell", `${input.name} created`);

  return mapCampaign(data, new Map([[company.id, company.name]]));
}

export async function createFolder(profile: Profile, input: {
  campaign: string;
  company: string;
  name: string;
}) {
  assertCanCreate(profile);

  const campaign = await findCampaign(input.company, input.campaign);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("folders")
    .insert({
      campaign_id: campaign.id,
      name: input.name,
    })
    .select("id,campaign_id,name")
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  await logActivity("bell", `${input.name} folder created`);

  return {
    count: 0,
    id: data.id,
    name: data.name,
  } satisfies PortalFolder;
}

export async function createContent(profile: Profile, input: CreateContentInput) {
  assertCanCreate(profile);

  const campaign = await findCampaign(input.company, input.campaign);
  const supabase = getSupabaseAdmin();
  const id = `APL-${Date.now().toString().slice(-5)}`;

  const { data, error } = await supabase
    .from("content_items")
    .insert({
      accent: platformAccent(input.platform),
      campaign_id: campaign.id,
      comments_count: 0,
      content_type: input.type,
      due_label: input.due,
      file_name: input.fileName,
      folder: input.folder,
      id,
      mime_type: input.mimeType,
      owner_name: profile.name,
      platform: input.platform,
      progress: 100,
      share_mode: "Private",
      size_label: input.size,
      status: "Submitted",
      storage_key: input.storageKey,
      tags: input.tags,
      title: input.title,
      unresolved_count: 0,
      version: "V1",
    })
    .select(contentSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  await ensureFolder(campaign.id, input.folder);
  await logActivity("upload", `${input.title} uploaded`);

  const companyMap = new Map([[campaign.company_id, input.company]]);
  const campaignMap = new Map([[campaign.id, campaign]]);

  return mapContent(data, campaignMap, companyMap);
}

export async function addComment(profile: Profile, contentId: string, input: {
  anchor: string;
  body: string;
}) {
  assertCanComment(profile);

  const supabase = getSupabaseAdmin();
  const content = await getContentRow(contentId);
  const { data: comment, error } = await supabase
    .from("content_comments")
    .insert({
      anchor: input.anchor,
      author_name: profile.name,
      body: input.body,
      content_id: contentId,
      role: profile.role,
      status: "Open",
    })
    .select("id,content_id,author_name,role,anchor,body,status")
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  const updated = await updateContentCounts(content, {
    commentsDelta: 1,
    nextStatus: "Changes Requested",
    unresolvedDelta: 1,
  });

  await logActivity("comment", `Comment added to ${contentId}`);

  return {
    comment: mapComment(comment),
    item: await mapContentWithLookups(updated),
  };
}

export async function resolveComment(profile: Profile, commentId: string) {
  assertCanComment(profile);

  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("content_comments")
    .select("id,content_id,author_name,role,anchor,body,status")
    .eq("id", commentId)
    .single();

  if (existingError || !existing) {
    throw new ApiError(existingError?.message ?? "Comment not found.", 404);
  }

  if (existing.status === "Resolved") {
    return {
      comment: mapComment(existing),
      item: await mapContentWithLookups(await getContentRow(existing.content_id)),
    };
  }

  const { data: comment, error } = await supabase
    .from("content_comments")
    .update({ status: "Resolved" })
    .eq("id", commentId)
    .select("id,content_id,author_name,role,anchor,body,status")
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  const content = await getContentRow(existing.content_id);
  const nextUnresolved = Math.max(0, (content.unresolved_count ?? 0) - 1);
  const updated = await updateContentCounts(content, {
    nextStatus: nextUnresolved === 0 ? "In Review" : content.status,
    unresolvedDelta: -1,
  });

  await logActivity("comment", `Comment resolved on ${existing.content_id}`);

  return {
    comment: mapComment(comment),
    item: await mapContentWithLookups(updated),
  };
}

export async function approveContent(profile: Profile, contentId: string) {
  assertCanApprove(profile);

  const content = await getContentRow(contentId);

  if ((content.unresolved_count ?? 0) > 0) {
    throw new ApiError("Resolve open comments before approval.", 409);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      approved_at: new Date().toISOString(),
      status: "Approved",
    })
    .eq("id", contentId)
    .select(contentSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  await logActivity("check", `${data.title} approved`);
  return mapContentWithLookups(data);
}

export async function archiveContent(profile: Profile, contentId: string) {
  assertCanArchive(profile);
  return scheduleArchive(contentId);
}

export async function shareContent(profile: Profile, contentId: string, mode: "Private" | "Public") {
  const content = await getContentRow(contentId);
  const supabase = getSupabaseAdmin();
  const token = randomUUID();

  const { error: shareError } = await supabase.from("share_links").insert({
    content_id: contentId,
    created_by: profile.id,
    mode,
    token,
  });

  if (shareError) {
    throw new ApiError(shareError.message, 500);
  }

  const { data, error } = await supabase
    .from("content_items")
    .update({ share_mode: mode })
    .eq("id", contentId)
    .select(contentSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  await logActivity("share", `${mode} link created for ${content.id}`);

  return {
    item: await mapContentWithLookups(data),
    url: `${getAppBaseUrl()}/?content=${encodeURIComponent(contentId)}&share=${encodeURIComponent(token)}`,
  };
}

export async function downloadContent(profile: Profile, contentId: string, final: boolean) {
  const content = await getContentRow(contentId);
  let nextItem = await mapContentWithLookups(content);

  if (final && content.status === "Approved") {
    nextItem = await scheduleArchive(contentId);
  }

  if (content.storage_key && isR2Configured()) {
    return {
      downloadUrl: await createDownloadUrl(content.storage_key, content.file_name ?? content.title),
      item: nextItem,
    };
  }

  return {
    item: nextItem,
    metadata: {
      downloadedBy: profile.email,
      fileName: content.file_name,
      generatedAt: new Date().toISOString(),
      id: content.id,
      platform: content.platform,
      status: content.status,
      title: content.title,
      version: content.version,
    },
  };
}

async function scheduleArchive(contentId: string) {
  const supabase = getSupabaseAdmin();
  const deleteAt = new Date();
  deleteAt.setDate(deleteAt.getDate() + 7);

  const { data, error } = await supabase
    .from("content_items")
    .update({
      archive_delete_at: deleteAt.toISOString(),
      status: "Archive Scheduled",
    })
    .eq("id", contentId)
    .select(contentSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  await logActivity("archive", `${data.title} marked for archive`);
  return mapContentWithLookups(data);
}

async function findOrCreateCompany(name: string): Promise<CompanyRow> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: findError } = await supabase
    .from("companies")
    .select("id,name")
    .ilike("name", name)
    .maybeSingle();

  if (findError) {
    throw new ApiError(findError.message, 500);
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("companies")
    .insert({ name })
    .select("id,name")
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  return data;
}

async function findCampaign(companyName: string, campaignName: string): Promise<CampaignRow> {
  const supabase = getSupabaseAdmin();
  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id,name")
    .ilike("name", companyName)
    .limit(1);

  if (companyError) {
    throw new ApiError(companyError.message, 500);
  }

  const company = companies?.[0] ?? (await findOrCreateCompany(companyName));
  const { data, error } = await supabase
    .from("campaigns")
    .select("id,company_id,name,due_label,status,progress")
    .eq("company_id", company.id)
    .ilike("name", campaignName)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  if (!data) {
    throw new ApiError("Campaign not found.", 404);
  }

  return data;
}

async function ensureFolder(campaignId: string, name: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("folders")
    .select("id")
    .eq("campaign_id", campaignId)
    .ilike("name", name)
    .maybeSingle();

  if (!existing) {
    await supabase.from("folders").insert({ campaign_id: campaignId, name });
  }
}

async function getVisibleCampaignIds(profile: Profile, campaigns: CampaignRow[]) {
  if (profile.role !== "Approver") {
    return new Set(campaigns.map((campaign) => campaign.id));
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("campaign_members")
    .select("campaign_id")
    .eq("profile_id", profile.id);

  if (error) {
    throw new ApiError(error.message, 500);
  }

  return new Set((data ?? []).map((item) => item.campaign_id as string));
}

async function loadFolders(campaignIds: string[]): Promise<PortalFolder[]> {
  if (!campaignIds.length) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data: folders, error } = await supabase
    .from("folders")
    .select("id,campaign_id,name")
    .in("campaign_id", campaignIds)
    .order("name");

  if (error) {
    throw new ApiError(error.message, 500);
  }

  const { data: content } = await supabase
    .from("content_items")
    .select("folder")
    .in("campaign_id", campaignIds);

  const counts = new Map<string, number>();
  for (const item of content ?? []) {
    counts.set(item.folder, (counts.get(item.folder) ?? 0) + 1);
  }

  return (folders ?? []).map((folder: FolderRow) => ({
    count: counts.get(folder.name) ?? 0,
    id: folder.id,
    name: folder.name,
  }));
}

async function loadContentItems(campaignIds: string[]): Promise<ContentRow[]> {
  if (!campaignIds.length) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("content_items")
    .select(contentSelect)
    .in("campaign_id", campaignIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(error.message, 500);
  }

  return (data ?? []) as ContentRow[];
}

async function loadComments(campaignIds: string[]): Promise<PortalComment[]> {
  if (!campaignIds.length) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data: content } = await supabase
    .from("content_items")
    .select("id")
    .in("campaign_id", campaignIds);
  const contentIds = (content ?? []).map((item) => item.id);

  if (!contentIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("content_comments")
    .select("id,content_id,author_name,role,anchor,body,status")
    .in("content_id", contentIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(error.message, 500);
  }

  return (data ?? []).map(mapComment);
}

async function loadActivity(): Promise<PortalActivity[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("activity_events")
    .select("id,kind,title,meta")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new ApiError(error.message, 500);
  }

  return ((data ?? []) as ActivityRow[]).map((item) => ({
    id: item.id,
    kind: item.kind ?? "bell",
    meta: item.meta ?? "Just now",
    title: item.title,
  }));
}

async function getContentRow(contentId: string): Promise<ContentRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("content_items")
    .select(contentSelect)
    .eq("id", contentId)
    .single();

  if (error || !data) {
    throw new ApiError(error?.message ?? "Content not found.", 404);
  }

  return data as ContentRow;
}

async function updateContentCounts(
  content: ContentRow,
  update: {
    commentsDelta?: number;
    nextStatus: ContentRow["status"];
    unresolvedDelta?: number;
  },
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      comments_count: Math.max(0, (content.comments_count ?? 0) + (update.commentsDelta ?? 0)),
      status: update.nextStatus,
      unresolved_count: Math.max(
        0,
        (content.unresolved_count ?? 0) + (update.unresolvedDelta ?? 0),
      ),
    })
    .eq("id", content.id)
    .select(contentSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  return data as ContentRow;
}

async function mapContentWithLookups(row: ContentRow) {
  const supabase = getSupabaseAdmin();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,company_id,name,due_label,status,progress")
    .eq("id", row.campaign_id)
    .single();

  if (campaignError) {
    throw new ApiError(campaignError.message, 500);
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id,name")
    .eq("id", campaign.company_id)
    .single();

  if (companyError) {
    throw new ApiError(companyError.message, 500);
  }

  return mapContent(row, new Map([[campaign.id, campaign]]), new Map([[company.id, company.name]]));
}

async function logActivity(kind: PortalActivity["kind"], title: string) {
  const supabase = getSupabaseAdmin();
  await supabase.from("activity_events").insert({
    kind,
    meta: "Just now",
    title,
  });
}

function mapCampaign(row: CampaignRow, companies: Map<string, string>): PortalCampaign {
  return {
    approvers: "Assigned approvers",
    company: companies.get(row.company_id) ?? "Unknown company",
    due: row.due_label ?? "No due date",
    id: row.id,
    name: row.name,
    progress: row.progress ?? 0,
    status: row.status ?? "Planning",
  };
}

function mapContent(
  row: ContentRow,
  campaigns: Map<string, CampaignRow>,
  companies: Map<string, string>,
): PortalContent {
  const campaign = campaigns.get(row.campaign_id);
  const companyName = campaign ? companies.get(campaign.company_id) : undefined;

  return {
    accent: row.accent ?? platformAccent(row.platform),
    approvedAt: row.approved_at ?? undefined,
    archiveDeleteAt: row.archive_delete_at
      ? new Date(row.archive_delete_at).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
        })
      : undefined,
    campaign: campaign?.name ?? "Unknown campaign",
    comments: row.comments_count ?? 0,
    company: companyName ?? "Unknown company",
    due: row.due_label ?? "No due date",
    fileName: row.file_name ?? undefined,
    folder: row.folder ?? "Unsorted",
    id: row.id,
    mimeType: row.mime_type ?? undefined,
    owner: row.owner_name ?? "Creative",
    platform: row.platform,
    progress: row.progress ?? 100,
    shareMode: row.share_mode ?? "Private",
    size: row.size_label ?? "0MB",
    status: row.status,
    storageKey: row.storage_key ?? undefined,
    tags: row.tags ?? [],
    title: row.title,
    type: row.content_type,
    unresolved: row.unresolved_count ?? 0,
    version: row.version ?? "V1",
  };
}

function mapComment(row: CommentRow): PortalComment {
  return {
    anchor: row.anchor ?? "General",
    author: row.author_name ?? "Reviewer",
    body: row.body,
    contentId: row.content_id,
    id: row.id,
    role: row.role ?? "Approver",
    status: row.status,
  };
}

const contentSelect =
  "id,campaign_id,title,platform,status,content_type,folder,due_label,owner_name,version,size_label,file_name,storage_key,mime_type,comments_count,unresolved_count,progress,accent,tags,share_mode,approved_at,archive_delete_at";
