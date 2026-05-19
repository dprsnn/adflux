import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/admin/users?search=...&role=...&page=...&limit=...
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search")?.trim() || "";
  const role = sp.get("role") || "";
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(parseInt(sp.get("limit") || "25"), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role === "ADMIN" || role === "USER") {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        _count: { select: { brands: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit });
}

// PATCH /api/admin/users  { userId, role }
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, role } = body;

  if (!userId || (role !== "ADMIN" && role !== "USER")) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: "Не можна змінити свою роль" },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return NextResponse.json(updated);
}
