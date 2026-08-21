import PortalClient from "../../../../portal-client";

export default async function CampaignContentPage({
  params,
}: {
  params: Promise<{ id: string; contentId: string }>;
}) {
  const { id, contentId } = await params;

  return (
    <PortalClient
      initialCampaignId={id}
      initialContentId={contentId}
      initialStage="content"
      initialView="Campaigns"
    />
  );
}
