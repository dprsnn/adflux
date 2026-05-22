import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPromptsClient } from "@/components/admin-prompts";

export default async function AdminPromptsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return <AdminPromptsClient />;
}
