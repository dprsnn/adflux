import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";
import { Sidebar } from "@/components/sidebar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center">
            <Image src="/Logo.svg" alt="AdFlux" width={100} height={29} />
          </Link>

          <UserMenu
            email={user.email}
            name={user.name}
            avatarUrl={user.avatarUrl}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isAdmin={isAdmin} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
