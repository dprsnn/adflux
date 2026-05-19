import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/brands/:id — get a single brand
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const brand = await prisma.brand.findFirst({
    where: { id, userId: user.id },
    include: {
      products: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!brand) {
    return NextResponse.json({ error: "Бренд не знайдено" }, { status: 404 });
  }

  return NextResponse.json(brand);
}

// PATCH /api/brands/:id — update a brand
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.brand.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Бренд не знайдено" }, { status: 404 });
  }

  const body = await request.json();
  const { name, url, logoUrl } = body;

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(url !== undefined && { url: url || null }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
    },
  });

  return NextResponse.json(brand);
}

// DELETE /api/brands/:id — delete a brand
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.brand.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Бренд не знайдено" }, { status: 404 });
  }

  await prisma.brand.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
