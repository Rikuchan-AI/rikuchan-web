import { listApiKeys } from "@/lib/gateway";
import { ApiKeyList } from "@/components/dashboard/api-key-list";

export default async function DashboardApiKeysPage() {
  let keys: Awaited<ReturnType<typeof listApiKeys>> = [];

  try {
    keys = await listApiKeys();
  } catch {
    // Gateway offline — show empty list
  }

  return <ApiKeyList initialKeys={keys} />;
}
