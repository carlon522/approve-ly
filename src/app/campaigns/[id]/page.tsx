import PortalClient from "../../portal-client";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

    return <PortalClient initialCampaignId={id} initialView="Campaigns" />;
}
