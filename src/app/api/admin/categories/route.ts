import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod/v4";

const createSchema = z.object({
  name: z.string().min(1, "Назва обов'язкова").max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug: лише a-z, 0-9, -"),
  description: z.string().max(500).optional(),
});

// GET /api/admin/categories
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { references: true } } },
    });

    return NextResponse.json(categories);
  } catch (err) {
    console.error("GET /api/admin/categories error:", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// POST /api/admin/categories
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

    const existing = await prisma.category.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Категорія з таким slug вже існує" },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/categories error:", err);
    return NextResponse.json({ error: "Помилка збереження" }, { status: 500 });
  }
}

// PATCH /api/admin/categories { id, name?, slug?, description? }
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, name, slug, description } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id обов'язковий" }, { status: 400 });
    }

    if (slug) {
      const existing = await prisma.category.findFirst({
        where: { slug, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Категорія з таким slug вже існує" },
          { status: 409 }
        );
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    return NextResponse.json(category);
  } catch (err) {
    console.error("PATCH /api/admin/categories error:", err);
    return NextResponse.json({ error: "Помилка збереження" }, { status: 500 });
  }
}

// DELETE /api/admin/categories { id }
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

    const refCount = await prisma.reference.count({ where: { categoryId: id } });
    if (refCount > 0) {
      return NextResponse.json(
        { error: `Неможливо видалити: ${refCount} референсів використовують цю категорію` },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/categories error:", err);
    return NextResponse.json({ error: "Помилка видалення" }, { status: 500 });
  }
}
