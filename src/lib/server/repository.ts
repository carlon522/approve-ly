import { randomUUID } from "node:crypto";
import { getAppBaseUrl, isStorageConfigured } from "./env";
import { ApiError } from "./http";
import {
  assertCanApprove,
  assertCanArchive,
  assertCanComment,
  assertCanCreate,
  assertCanUnapprove,
} from "./permissions";
import { createDownloadUrl, deleteStoredObject } from "./storage";
import { getSupabaseAdmin } from "./supabase";
import type {
  BootstrapPayload,
  CreateContentInput,
  PortalActivity,
  PortalCampaign,
  PortalCampaignMember,
  PortalComment,
  PortalContent,
  PortalFolder,
  Profile,
  Role,
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
  const membershipQuery =
    profile.role === "Creative"
      ? Promise.resolve({ data: [] as Array<{ campaign_id: string }>, error: null })
      : supabase
          .from("campaign_members")
          .select("campaign_id")
          .eq("profile_id", profile.id);
  const [companyResult, campaignResult, membershipResult] = await Promise.all([
    supabase.from("companies").select("id,name").order("name"),
    supabase
      .from("campaigns")
      .select("id,company_id,name,due_label,status,progress")
      .order("created_at", { ascending: false }),
    membershipQuery,
  ]);

  if (companyResult.error) {
    throw new ApiError(companyResult.error.message, 500);
  }

  if (campaignResult.error) {
    throw new ApiError(campaignResult.error.message, 500);
  }

  if (membershipResult.error) {
    throw new ApiError(membershipResult.error.message, 500);
  }

  const campaigns = (campaignResult.data ?? []) as CampaignRow[];
  const visibleCampaignIds =
    profile.role === "Creative"
      ? new Set(campaigns.map((campaign) => campaign.id))
      : new Set((membershipResult.data ?? []).map((item) => item.campaign_id as string));
  const visibleCampaigns = campaigns.filter((campaign) =>
    visibleCampaignIds.has(campaign.id),
  );
  const visibleCampaignIdList = visibleCampaigns.map((campaign) => campaign.id);

  const [folderRows, contentItems, comments, activity] = await Promise.all([
    loadFolders(visibleCampaignIdList),
    loadContentItems(visibleCampaignIdList),
    loadComments(visibleCampaignIdList),
    loadActivity(),
  ]);

  const folders = mapFolders(folderRows, contentItems);
  const companyMap = new Map((companyResult.data ?? []).map((company) => [company.id, company.name]));
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

export async function listCampaignMembers(
  profile: Profile,
  campaignId: string,
): Promise<PortalCampaignMember[]> {
  assertCanCreate(profile);

  const supabase = getSupabaseAdmin();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    throw new ApiError(campaignError?.message ?? "Campaign not found.", 404);
  }

  const { data: memberRows, error: memberError } = await supabase
    .from("campaign_members")
    .select("id,campaign_id,profile_id,role")
    .eq("campaign_id", campaign.id)
    .eq("role", "Approver")
    .order("created_at", { ascending: true });

  if (memberError) {
    throw new ApiError(memberError.message, 500);
  }

  const rows = (memberRows ?? []) as Array<{
    campaign_id: string;
    id: string;
    profile_id: string;
    role: Role;
  }>;

  if (!rows.length) {
    return [];
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,name")
    .in("id", rows.map((row) => row.profile_id));

  if (profileError) {
    throw new ApiError(profileError.message, 500);
  }

  const profileMap = new Map(
    (profiles ?? []).map((member) => [
      member.id,
      { email: member.email, id: member.id, name: member.name },
    ]),
  );

  return rows.flatMap((row) => {
    const member = profileMap.get(row.profile_id);

    return member
      ? [
          {
            campaignId: row.campaign_id,
            email: member.email,
            id: row.id,
            name: member.name,
            profileId: member.id,
            role: "Approver" as Role,
          },
        ]
      : [];
  });
}

export async function addCampaignApprover(
  profile: Profile,
  campaignId: string,
  email: string,
): Promise<PortalCampaignMember> {
  assertCanCreate(profile);

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError("Enter the approver's account email.", 400);
  }

  const supabase = getSupabaseAdmin();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,name")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    throw new ApiError(campaignError?.message ?? "Campaign not found.", 404);
  }

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id,email,name,role")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (targetError) {
    throw new ApiError(targetError.message, 500);
  }

  if (!target) {
    throw new ApiError("No Approve.ly account was found for that email. Ask them to create an account first.", 404);
  }

  if (target.role !== "Approver") {
    throw new ApiError("That account is not set up as an Approver yet.", 400);
  }

  const { data: member, error: memberError } = await supabase
    .from("campaign_members")
    .upsert(
      {
        campaign_id: campaign.id,
        profile_id: target.id,
        role: "Approver",
      },
      { onConflict: "campaign_id,profile_id" },
    )
    .select("id,campaign_id,profile_id,role")
    .single();

  if (memberError || !member) {
    throw new ApiError(memberError?.message ?? "Unable to grant campaign access.", 500);
  }

  await logActivity("bell", `${target.name} added to ${campaign.name} as an Approver`);

  return {
    campaignId: member.campaign_id,
    email: target.email,
    id: member.id,
    name: target.name,
    profileId: target.id,
    role: "Approver",
  };
}

export async function confirmProfileRole(profile: Profile, role: Role): Promise<Profile> {
  if (profile.roleConfirmed) {
    throw new ApiError("Your role is already confirmed. Contact an administrator to change it.", 409);
  }

  if (!(["Creative", "Approver", "Assistant"] as Role[]).includes(role)) {
    throw new ApiError("Choose a valid workspace role.", 400);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role, role_confirmed: true })
    .eq("id", profile.id)
    .select("id,email,name,role,role_confirmed")
    .single();

  if (error || !data) {
    throw new ApiError(error?.message ?? "Unable to save your workspace role.", 500);
  }

  await logActivity("bell", `${data.name} joined as ${data.role}`);

  return {
    email: data.email,
    id: data.id,
    name: data.name,
    role: data.role as Role,
    roleConfirmed: Boolean(data.role_confirmed),
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
        roleConfirmed: true,
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

export async function deleteContent(profile: Profile, contentId: string) {
  assertCanCreate(profile);

  const content = await getContentRow(contentId);
  await assertContentAccess(profile, content);

  if (content.storage_key && isStorageConfigured()) {
    await deleteStoredObject(content.storage_key);
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("content_items").delete().eq("id", contentId);

  if (error) {
    throw new ApiError(error.message, 500);
  }

  await logActivity("archive", `${content.title} deleted`);
  return { id: contentId };
}

export async function deleteCampaign(profile: Profile, campaignId: string) {
  assertCanCreate(profile);

  const supabase = getSupabaseAdmin();
  const { data: contentRows, error: contentError } = await supabase
    .from("content_items")
    .select("id,title,storage_key")
    .eq("campaign_id", campaignId);

  if (contentError) {
    throw new ApiError(contentError.message, 500);
  }

  if (isStorageConfigured()) {
    for (const content of contentRows ?? []) {
      if (content.storage_key) {
        await deleteStoredObject(content.storage_key);
      }
    }
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,name")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new ApiError(campaignError?.message ?? "Campaign not found.", 404);
  }

  const { error: deleteError } = await supabase.from("campaigns").delete().eq("id", campaignId);

  if (deleteError) {
    throw new ApiError(deleteError.message, 500);
  }

  await logActivity("archive", `${campaign.name} deleted`);
  return { id: campaignId };
}

export async function deleteFolder(profile: Profile, folderId: string) {
  assertCanCreate(profile);

  const supabase = getSupabaseAdmin();
  const { data: folder, error: folderError } = await supabase
    .from("folders")
    .select("id,campaign_id,name")
    .eq("id", folderId)
    .single();

  if (folderError || !folder) {
    throw new ApiError(folderError?.message ?? "Folder not found.", 404);
  }

  const { count: exactCount, error: exactError } = await supabase
    .from("content_items")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", folder.campaign_id)
    .eq("folder", folder.name);

  if (exactError) {
    throw new ApiError(exactError.message, 500);
  }

  const { count: nestedCount, error: nestedError } = await supabase
    .from("content_items")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", folder.campaign_id)
    .like("folder", `${folder.name} /%`);

  if (nestedError) {
    throw new ApiError(nestedError.message, 500);
  }

  if ((exactCount ?? 0) + (nestedCount ?? 0) > 0) {
    throw new ApiError("Move or delete the content in this folder before deleting it.", 409);
  }

  const { error } = await supabase.from("folders").delete().eq("id", folderId);

  if (error) {
    throw new ApiError(error.message, 500);
  }

  await logActivity("archive", `${folder.name} folder deleted`);
  return { id: folderId };
}

export async function addComment(profile: Profile, contentId: string, input: {
  anchor: string;
  body: string;
}) {
  assertCanComment(profile);

  const supabase = getSupabaseAdmin();
  const content = await getContentRow(contentId);
  await assertContentAccess(profile, content);
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

  const existingContent = await getContentRow(existing.content_id);
  await assertContentAccess(profile, existingContent);

  if (existing.status === "Resolved") {
    return {
      comment: mapComment(existing),
      item: await mapContentWithLookups(existingContent),
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

  const nextUnresolved = Math.max(0, (existingContent.unresolved_count ?? 0) - 1);
  const updated = await updateContentCounts(existingContent, {
    nextStatus: nextUnresolved === 0 ? "In Review" : existingContent.status,
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
  await assertContentAccess(profile, content);

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

export async function unapproveContent(profile: Profile, contentId: string) {
  assertCanUnapprove(profile);

  const content = await getContentRow(contentId);
  await assertContentAccess(profile, content);

  if (content.status !== "Approved" && content.status !== "Archive Scheduled") {
    throw new ApiError("Only approved content can be unapproved.", 409);
  }

  if (content.status === "Archive Scheduled" && !content.storage_key) {
    throw new ApiError("This archived media has already been deleted and cannot be unapproved.", 409);
  }

  const nextStatus = (content.unresolved_count ?? 0) > 0 ? "Changes Requested" : "In Review";
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      approved_at: null,
      archive_delete_at: null,
      status: nextStatus,
    })
    .eq("id", contentId)
    .select(contentSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  await logActivity("bell", `${data.title} unapproved`);
  return mapContentWithLookups(data);
}

export async function archiveContent(profile: Profile, contentId: string) {
  assertCanArchive(profile);
  return scheduleArchive(contentId);
}

export async function shareContent(profile: Profile, contentId: string, mode: "Private" | "Public") {
  const content = await getContentRow(contentId);
  await assertContentAccess(profile, content);
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
  await assertContentAccess(profile, content);
  let nextItem = await mapContentWithLookups(content);

  if (final && content.status === "Approved") {
    nextItem = await scheduleArchive(contentId);
  }

  if (content.storage_key && isStorageConfigured()) {
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

export async function cleanupArchivedContent() {
  if (!isStorageConfigured()) {
    throw new ApiError("Supabase Storage is not configured.", 503);
  }

  const supabase = getSupabaseAdmin();
  const { data: dueItems, error: findError } = await supabase
    .from("content_items")
    .select("id,title,storage_key,archive_delete_at")
    .eq("status", "Archive Scheduled")
    .not("archive_delete_at", "is", null)
    .lte("archive_delete_at", new Date().toISOString())
    .not("storage_key", "is", null)
    .limit(100);

  if (findError) {
    throw new ApiError(findError.message, 500);
  }

  const deleted: string[] = [];
  const failures: Array<{ id: string; error: string }> = [];

  for (const item of dueItems ?? []) {
    if (!item.storage_key) {
      continue;
    }

    try {
      await deleteStoredObject(item.storage_key);
      const { error: updateError } = await supabase
        .from("content_items")
        .update({
          mime_type: null,
          size_label: "Archived",
          storage_key: null,
        })
        .eq("id", item.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await logActivity("archive", `${item.title} archived; media deleted`);
      deleted.push(item.id);
    } catch (error) {
      failures.push({
        error: error instanceof Error ? error.message : "Unknown cleanup error",
        id: item.id,
      });
    }
  }

  return {
    deleted,
    failed: failures,
    scanned: dueItems?.length ?? 0,
  };
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

async function assertContentAccess(profile: Profile, content: ContentRow) {
  if (profile.role === "Creative") {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("campaign_members")
    .select("campaign_id")
    .eq("campaign_id", content.campaign_id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  if (!data) {
    throw new ApiError("This content is outside your assigned campaigns.", 403);
  }
}

async function loadFolders(campaignIds: string[]): Promise<FolderRow[]> {
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

  return (folders ?? []) as FolderRow[];
}

function mapFolders(rows: FolderRow[], content: ContentRow[]): PortalFolder[] {
  const counts = new Map<string, number>();

  for (const item of content) {
    const key = `${item.campaign_id}:${item.folder}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return rows.map((folder) => ({
    count: counts.get(`${folder.campaign_id}:${folder.name}`) ?? 0,
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
  const { data, error } = await supabase
    .from("content_comments")
    .select("id,content_id,author_name,role,anchor,body,status,content_items!inner(campaign_id)")
    .in("content_items.campaign_id", campaignIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(error.message, 500);
  }

  return (data ?? []).map((row) => mapComment(row as CommentRow));
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
    mediaUrl: row.storage_key ? undefined : "/demo/approval-preview.mp4",
    owner: row.owner_name ?? "Creative",
    platform: row.platform,
    progress: row.progress ?? 100,
    shareMode: row.share_mode ?? "Private",
    size: row.storage_key ? row.size_label ?? "0MB" : "1.1MB",
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
