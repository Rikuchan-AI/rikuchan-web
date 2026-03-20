import { listProviders, getWorkspace } from "@/lib/gateway";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function DashboardSettingsPage() {
  let providers: Awaited<ReturnType<typeof listProviders>> = [];
  let workspace = { name: "Rikuchan Starter", plan: "starter", providers_connected: 0, knowledge_sources: 0 };

  try { providers = await listProviders(); } catch { /* gateway offline */ }
  try { workspace = await getWorkspace(); } catch { /* fallback */ }

  return <SettingsForm initialProviders={providers} workspaceName={workspace.name} />;
}
