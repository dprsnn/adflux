import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function verifyProductOwnership(productId: string, userId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      brand: { userId },
    },
    include: { brand: true },
  });
}

// GET /api/products/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await verifyProductOwnership(id, user.id);

  if (!product) {
    return NextResponse.json({ error: "Товар не знайдено" }, { status: 404 });
  }

  return NextResponse.json(product);
}

// PATCH /api/products/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await verifyProductOwnership(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Товар не знайдено" }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, price, promotion, imageUrls, productDna, status } = body;

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(price !== undefined && { price: price || null }),
      ...(promotion !== undefined && { promotion: promotion || null }),
      ...(imageUrls !== undefined && { imageUrls }),
      ...(productDna !== undefined && { productDna }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(product);
}

// DELETE /api/products/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await verifyProductOwnership(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Товар не знайдено" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
