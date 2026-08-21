import PortalClient from "../../../../portal-client";

export default async function CampaignFolderPage({
  params,
}: {
  params: Promise<{ id: string; folderId: string }>;
}) {
  const { id, folderId } = await params;

  return (
    <PortalClient
      initialCampaignId={id}
      initialFolderId={folderId}
      initialStage="folder"
      initialView="Campaigns"
    />
  );
}
