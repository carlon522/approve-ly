import {
  Archive,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Download,
  FileStack,
  Folder,
  FolderPlus,
  Gauge,
  ImageIcon,
  Inbox,
  LockKeyhole,
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
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  activity,
  campaigns,
  comments,
  contentItems,
  folders,
  metrics,
  type ContentItem,
  type Metric,
  type Platform,
  type Status,
} from "@/lib/portal-data";

const statusStyles: Record<Status, string> = {
  Submitted: "border-blue-200 bg-blue-50 text-blue-700",
  "In Review": "border-zinc-200 bg-zinc-50 text-zinc-700",
  "Changes Requested": "border-amber-200 bg-amber-50 text-amber-800",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Archive Scheduled": "border-orange-200 bg-orange-50 text-orange-800",
};

const metricToneStyles: Record<Metric["tone"], string> = {
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

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-zinc-950">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-3 py-3 sm:px-5 lg:flex-row lg:p-5">
        <Sidebar />
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <Topbar />
          <DashboardGrid />
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
            <CampaignWorkspace />
            <ApprovalWorkspace />
          </section>
        </section>
      </div>
    </main>
  );
}

function Sidebar() {
  const navItems = [
    { label: "Dashboard", icon: Gauge, active: true },
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
            <p className="truncate text-xs text-zinc-500">Super Admin view</p>
          </div>
        </div>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-zinc-500" />
      </div>

      <nav className="grid grid-cols-5 gap-1 lg:grid-cols-1" aria-label="Primary">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium transition lg:justify-start ${
              item.active
                ? "bg-zinc-950 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            }`}
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
          68% storage used
        </div>
        <div className="mt-3 h-2 rounded-md bg-white">
          <div className="h-2 w-[68%] rounded-md bg-emerald-600" />
        </div>
        <p className="mt-2 text-xs leading-5 text-emerald-800">
          3 approved files are ready for final download and archive.
        </p>
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="rounded-lg border border-[#dedbd2] bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">Welcome, Carlo</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-950 sm:text-3xl">
            Content approval command center
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SelectButton icon={Building2} label="Northstar Studio" />
          <SelectButton icon={CalendarDays} label="Q3 Launch" />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
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

function SelectButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      className="inline-flex h-11 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-300"
      type="button"
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <Icon aria-hidden className="size-4 shrink-0 text-zinc-500" />
        <span className="truncate">{label}</span>
      </span>
      <ChevronDown aria-hidden className="size-4 shrink-0 text-zinc-400" />
    </button>
  );
}

function DashboardGrid() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
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

function CampaignWorkspace() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <Panel title="Campaigns" action={<IconButton label="Add campaign" icon={Plus} />}>
          <div className="grid gap-3">
            {campaigns.map((campaign) => (
              <article
                key={campaign.name}
                className="rounded-lg border border-zinc-200 bg-white p-3 transition hover:border-zinc-300"
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
              </article>
            ))}
          </div>
        </Panel>

        <UploadPanel />
      </div>

      <Panel
        title="Campaign folders"
        action={<IconButton label="Add folder" icon={FolderPlus} />}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {folders.map((folder) => (
            <button
              key={folder.name}
              className="flex h-16 items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 text-left transition hover:border-zinc-300"
              type="button"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">
                  <Folder aria-hidden className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{folder.name}</span>
                  <span className="text-xs text-zinc-500">{folder.count} items</span>
                </span>
              </span>
              <ChevronDown aria-hidden className="size-4 -rotate-90 text-zinc-400" />
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="Content queue"
        action={
          <div className="flex items-center gap-2">
            <IconButton label="Search" icon={Search} />
            <IconButton label="Filter" icon={PanelRight} />
          </div>
        }
      >
        <div className="grid gap-3">
          {contentItems.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      </Panel>
    </section>
  );
}

function UploadPanel() {
  return (
    <Panel title="Upload brief" action={<IconButton label="Upload" icon={Upload} />}>
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-white text-zinc-700 shadow-sm">
            <Upload aria-hidden className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Direct upload ready</h2>
            <p className="mt-1 text-sm leading-5 text-zinc-600">
              Awaiting source assets. Preview processing starts after upload.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <Field label="Content type" value="Video, Image, Carousel" icon={FileStack} />
          <Field label="Platforms" value="Instagram, TikTok, YouTube Shorts" icon={Smartphone} />
          <Field label="Max file" value="5GB per file" icon={Video} />
          <Field label="Tags" value="Paid social, launch, creator" icon={Tag} />
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
        <div className="flex items-start gap-2 text-sm text-orange-900">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="leading-5">
            Storage warning at 85%. Three approved files are waiting in the archive queue.
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

function ContentCard({ item }: { item: ContentItem }) {
  return (
    <article className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm lg:grid-cols-[150px_minmax(0,1fr)_auto] lg:items-center">
      <div className="relative aspect-video overflow-hidden rounded-md bg-zinc-950">
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
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${platformStyles[item.platform]}`}>
            {item.platform}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <h3 className="mt-2 truncate text-base font-semibold">{item.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
          <span>{item.id}</span>
          <span>{item.folder}</span>
          <span>{item.size}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 lg:min-w-48 lg:justify-end">
        <div className="text-sm">
          <p className="font-semibold text-zinc-900">{item.due}</p>
          <p className="mt-1 text-zinc-500">{item.owner}</p>
        </div>
        <div className="flex items-center gap-1">
          <CommentCounter item={item} />
          <IconButton label="Download" icon={Download} />
          <IconButton label="More" icon={MoreHorizontal} />
        </div>
      </div>
    </article>
  );
}

function CommentCounter({ item }: { item: ContentItem }) {
  return (
    <span
      className={`inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border px-2 text-sm font-semibold ${
        item.unresolved > 0
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-zinc-200 bg-white text-zinc-600"
      }`}
      title={`${item.unresolved} unresolved comments`}
    >
      <MessageCircle aria-hidden className="size-4" />
      {item.comments}
    </span>
  );
}

function ApprovalWorkspace() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <Panel
        title="Approval review"
        action={
          <div className="flex items-center gap-2">
            <IconButton label="Private link" icon={LockKeyhole} />
            <IconButton label="Share" icon={Share2} />
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.92fr)_minmax(260px,1fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(260px,0.92fr)_minmax(260px,1fr)]">
          <PlatformPreview />
          <ReviewPanel />
        </div>
      </Panel>
      <ArchivePanel />
      <ActivityPanel />
    </section>
  );
}

function PlatformPreview() {
  const tabs: Platform[] = ["Instagram", "TikTok", "YouTube Shorts"];

  return (
    <div className="min-w-0">
      <div className="mb-3 grid grid-cols-3 rounded-md border border-zinc-200 bg-zinc-50 p-1">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            className={`h-9 rounded-md text-xs font-semibold transition ${
              index === 0 ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
            }`}
            type="button"
          >
            {tab === "YouTube Shorts" ? "Shorts" : tab}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-[330px] rounded-[28px] border border-zinc-300 bg-zinc-950 p-2 shadow-sm">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] bg-black text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,#2563eb,transparent_28%),linear-gradient(160deg,#121212_10%,#0f8a5f_48%,#18181b_100%)]" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3 text-xs font-semibold">
            <span>9:41</span>
            <span className="rounded-md bg-black/35 px-2 py-1">Preview</span>
          </div>
          <div className="absolute inset-x-8 top-20 bottom-28 rounded-md border border-white/35" />
          <div className="absolute left-4 right-16 bottom-5">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-md bg-white text-xs font-bold text-zinc-950">
                NS
              </div>
              <span className="text-sm font-semibold">@northstarstudio</span>
            </div>
            <p className="mt-3 text-sm leading-5">
              Summer drop reveal with final CTA and creator voiceover.
            </p>
            <p className="mt-2 text-xs text-white/80">Original audio - Q3 Launch</p>
          </div>
          <div className="absolute bottom-7 right-3 flex flex-col gap-4">
            <PreviewIcon icon={Check} label="12k" />
            <PreviewIcon icon={MessageCircle} label="248" />
            <PreviewIcon icon={Send} label="Share" />
          </div>
          <button
            className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md bg-white/20 backdrop-blur"
            type="button"
            aria-label="Play preview"
          >
            <Play aria-hidden className="size-7 fill-white text-white" />
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

function ReviewPanel() {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <div className="flex gap-2">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="leading-5">Approval is blocked until 2 unresolved comments are resolved.</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {comments.map((comment) => (
          <article key={`${comment.author}-${comment.anchor}`} className="rounded-lg border border-zinc-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{comment.author}</p>
                <p className="text-xs text-zinc-500">{comment.role} at {comment.anchor}</p>
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
          </article>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
          type="button"
        >
          <MessageCircle aria-hidden className="size-4" />
          Comment
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-300 px-3 text-sm font-semibold text-zinc-600"
          type="button"
          aria-disabled="true"
        >
          <Check aria-hidden className="size-4" />
          Approve
        </button>
      </div>
    </div>
  );
}

function ArchivePanel() {
  return (
    <Panel title="Final download and archive">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="Approved" />
            <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">
              Archive available
            </span>
          </div>
          <p className="mt-2 text-sm leading-5 text-zinc-600">
            Delete date is held for 7 days after archive scheduling.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold"
            type="button"
          >
            <Download aria-hidden className="size-4" />
            Final
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-orange-700 px-3 text-sm font-semibold text-white"
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

function ActivityPanel() {
  return (
    <Panel title="Activity">
      <div className="grid gap-2">
        {activity.map((item) => (
          <div key={item.title} className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">
              <item.icon aria-hidden className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-zinc-500">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
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

function IconButton({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <button
      className="grid size-10 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
      type="button"
      aria-label={label}
      title={label}
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
