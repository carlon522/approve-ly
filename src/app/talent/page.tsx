import PortalClient from "../portal-client";

export default async function TalentPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const params = await searchParams;

  return <PortalClient initialTalent={params.name} initialView="Talent content" />;
}
