import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";

const createProductSchema = z.object({
  brandId: z.string().min(1, "brandId обов'язковий"),
  name: z.string().min(1, "Назва товару обов'язкова").max(200),
  description: z.string().max(5000).nullable().optional(),
  price: z.string().max(100).nullable().optional(),
  promotion: z.string().max(500).nullable().optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
  productDna: z.record(z.string(), z.unknown()).nullable().optional(),
});

// GET /api/products?brandId=xxx or /api/products?all=true
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = request.nextUrl.searchParams.get("all");
  const brandId = request.nextUrl.searchParams.get("brandId");
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50"), 100);
  const skip = (page - 1) * limit;

  // Return all products for the user — with pagination
  if (all) {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { brand: { userId: user.id } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          name: true,
          description: true,
          imageUrls: true,
          status: true,
          createdAt: true,
          brand: { select: { id: true, name: true } },
        },
      }),
      prisma.product.count({
        where: { brand: { userId: user.id } },
      }),
    ]);

    return NextResponse.json(products, {
      headers: {
        "X-Total-Count": total.toString(),
        "X-Page": page.toString(),
        "X-Limit": limit.toString(),
      },
    });
  }

  if (!brandId) {
    return NextResponse.json(
      { error: "brandId обов'язковий" },
      { status: 400 }
    );
  }

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: user.id },
    select: { id: true },
  });
  if (!brand) {
    return NextResponse.json({ error: "Бренд не знайдено" }, { status: 404 });
  }

  const products = await prisma.product.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip,
    select: {
      id: true,
      name: true,
      description: true,
      imageUrls: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(products);
}

// POST /api/products — create a new product
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = rateLimit(`products:create:${user.id}`, { windowMs: 60_000, max: 15 });
  if (!success) {
    return NextResponse.json(
      { error: "Забагато запитів. Зачекайте хвилину." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Невалідні дані" },
      { status: 400 }
    );
  }

  const { brandId, name, description, price, promotion, imageUrls, productDna } = parsed.data;

  // Verify brand ownership
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: user.id },
    select: { id: true },
  });
  if (!brand) {
    return NextResponse.json({ error: "Бренд не знайдено" }, { status: 404 });
  }

  const product = await prisma.product.create({
    data: {
      brandId,
      name: name.trim(),
      description: description || null,
      price: price || null,
      promotion: promotion || null,
      imageUrls: imageUrls ?? [],
      productDna: productDna
        ? (productDna as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      status: productDna ? "READY" : "DRAFT",
    },
  });

  return NextResponse.json(product, { status: 201 });
}
