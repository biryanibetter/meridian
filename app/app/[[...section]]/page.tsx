import { Workspace } from "@/components/workspace";
export const dynamicParams = false;
export function generateStaticParams() {
  return [
    { section: [] },
    ...["overview", "journeys", "journey", "optimize", "entry", "applications", "tasks", "documents",
      "travel", "layovers", "travel-day", "arrival", "budget", "safety",
      "family", "notifications", "settings", "sources", "ai"].map((section) => ({ section: [section] })),
  ];
}
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  return <Workspace section={section?.[0] ?? "overview"} />;
}
