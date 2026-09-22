import { redirect } from "next/navigation";

export default async function PortalRootPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/portal/${token}/plan`);
}
