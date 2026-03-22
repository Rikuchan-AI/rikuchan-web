import { redirect } from "next/navigation";
import { isStaff } from "@/lib/mc/staff";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staffAccess = await isStaff();
  if (!staffAccess) redirect("/dashboard");

  return <>{children}</>;
}
