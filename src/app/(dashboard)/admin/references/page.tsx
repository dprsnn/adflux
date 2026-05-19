import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminReferencesClient } from "@/components/admin-references";

export default async function AdminReferencesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return <AdminReferencesClient />;
}
