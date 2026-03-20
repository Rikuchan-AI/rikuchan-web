import { listProviders, getWorkspace } from "@/lib/gateway";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function DashboardSettingsPage() {
  let providers: Awaited<ReturnType<typeof listProviders>> = [];
  let workspace = { name: "Rikuchan Starter", plan: "starter", providers_connected: 0, knowledge_sources: 0 };

  try { providers = await listProviders(); } catch (e) { console.error("[settings] listProviders failed:", e); }
  try { workspace = await getWorkspace(); } catch (e) { console.error("[settings] getWorkspace failed:", e); }

  return <SettingsForm initialProviders={providers} workspaceName={workspace.name} />;
}
