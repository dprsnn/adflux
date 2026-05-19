import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";

const createBrandSchema = z.object({
  name: z.string().min(1, "Назва бренду обов'язкова").max(200),
  url: z.string().url("Невалідний URL").nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
});

// GET /api/brands — list all brands for current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brands = await prisma.brand.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      url: true,
      logoUrl: true,
      createdAt: true,
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json(brands);
}

// POST /api/brands — create a new brand
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = rateLimit(`brands:create:${user.id}`, { windowMs: 60_000, max: 10 });
  if (!success) {
    return NextResponse.json(
      { error: "Забагато запитів. Зачекайте хвилину." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = createBrandSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Невалідні дані" },
      { status: 400 }
    );
  }

  const { name, url, logoUrl } = parsed.data;

  const brand = await prisma.brand.create({
    data: {
      userId: user.id,
      name: name.trim(),
      url: url || null,
      logoUrl: logoUrl || null,
    },
  });

  return NextResponse.json(brand, { status: 201 });
}
