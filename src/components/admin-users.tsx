"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Shield,
  ShieldOff,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: { brands: number };
}

interface AdminUsersClientProps {
  currentUserId: string;
}

export function AdminUsersClient({ currentUserId }: AdminUsersClientProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const limit = 25;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Помилка завантаження");

      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      toast.error("Не вдалося завантажити користувачів");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  async function toggleRole(userId: string, currentRole: string) {
    setTogglingId(userId);
    try {
      const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Помилка");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as "USER" | "ADMIN" } : u))
      );
      toast.success(
        newRole === "ADMIN" ? "Користувача призначено адміністратором" : "Роль адміністратора знято"
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Помилка зміни ролі");
    } finally {
      setTogglingId(null);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Користувачі</h1>
        <p className="mt-1 text-muted-foreground">
          {total} {total === 1 ? "користувач" : total < 5 ? "користувачі" : "користувачів"}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за email або ім'ям..."
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Усі ролі</SelectItem>
            <SelectItem value="ADMIN">Адміністратори</SelectItem>
            <SelectItem value="USER">Користувачі</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {search || roleFilter !== "ALL"
                ? "Нічого не знайдено за вашим запитом"
                : "Користувачів ще немає"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const isToggling = togglingId === u.id;

            return (
              <Card key={u.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  {/* Avatar */}
                  {u.avatarUrl ? (
                    <img
                      src={u.avatarUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {(u.name?.[0] || u.email[0]).toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {u.name || u.email}
                      </p>
                      {u.role === "ADMIN" && (
                        <Badge variant="default" className="shrink-0 text-[10px]">
                          <Shield className="mr-1 h-3 w-3" />
                          Адмін
                        </Badge>
                      )}
                      {isSelf && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          Ви
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {u._count.brands}{" "}
                      {u._count.brands === 1
                        ? "бренд"
                        : u._count.brands < 5
                          ? "бренди"
                          : "брендів"}
                      {" · "}
                      {new Date(u.createdAt).toLocaleDateString("uk-UA")}
                    </p>
                  </div>

                  {/* Action */}
                  {!isSelf && (
                    <Button
                      variant={u.role === "ADMIN" ? "outline" : "secondary"}
                      size="sm"
                      disabled={isToggling}
                      onClick={() => toggleRole(u.id, u.role)}
                    >
                      {isToggling ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : u.role === "ADMIN" ? (
                        <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                      ) : (
                        <Shield className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {u.role === "ADMIN" ? "Зняти адміна" : "Зробити адміном"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
