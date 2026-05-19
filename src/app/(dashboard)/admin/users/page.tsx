import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminUsersClient } from "@/components/admin-users";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return <AdminUsersClient currentUserId={user.id} />;
}
