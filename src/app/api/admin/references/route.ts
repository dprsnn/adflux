import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod/v4";

const createSchema = z.object({
  imageUrl: z.string().url(),
  categoryId: z.string().min(1, "Категорія обов'язкова"),
  label: z.string().max(200).optional(),
  imagePrompt: z.string().optional(),
  textHint: z.string().optional(),
});

// GET /api/admin/references?categoryId=...
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const categoryId = request.nextUrl.searchParams.get("categoryId");
    const where: Record<string, unknown> = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const references = await prisma.reference.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });

    return NextResponse.json(references);
  } catch (err) {
    console.error("GET /api/admin/references error:", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// POST /api/admin/references
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Невалідні дані" },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) {
      return NextResponse.json({ error: "Категорію не знайдено" }, { status: 404 });
    }

    const ref = await prisma.reference.create({
      data: {
        imageUrl: parsed.data.imageUrl,
        categoryId: parsed.data.categoryId,
        label: parsed.data.label || null,
        imagePrompt: parsed.data.imagePrompt || null,
        textHint: parsed.data.textHint || null,
      },
      include: { category: true },
    });

    return NextResponse.json(ref, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/references error:", err);
    return NextResponse.json({ error: "Помилка збереження" }, { status: 500 });
  }
}

// PATCH /api/admin/references { id, ...fields }
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, imageUrl, imagePrompt, textHint, label, categoryId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id обов'язковий" }, { status: 400 });
    }

    const ref = await prisma.reference.update({
      where: { id },
      data: {
        ...(imageUrl !== undefined && { imageUrl }),
        ...(imagePrompt !== undefined && { imagePrompt: imagePrompt || null }),
        ...(textHint !== undefined && { textHint: textHint || null }),
        ...(label !== undefined && { label: label || null }),
        ...(categoryId !== undefined && { categoryId }),
      },
      include: { category: true },
    });

    return NextResponse.json(ref);
  } catch (err) {
    console.error("PATCH /api/admin/references error:", err);
    return NextResponse.json({ error: "Помилка збереження" }, { status: 500 });
  }
}

// DELETE /api/admin/references { id }
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id обов'язковий" }, { status: 400 });
    }

    await prisma.reference.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/references error:", err);
    return NextResponse.json({ error: "Помилка видалення" }, { status: 500 });
  }
}
