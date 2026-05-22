import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminCategoriesClient } from "@/components/admin-categories";

export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  return <AdminCategoriesClient />;
}
