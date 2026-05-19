import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod/v4";

const CREATIVE_TYPES = ["CONVERSION", "SOCIAL_PROOF", "PROMO", "UGC"] as const;

const createSchema = z.object({
  imageUrl: z.string().url(),
  creativeType: z.enum(CREATIVE_TYPES),
  label: z.string().max(200).optional(),
});

// GET /api/admin/references?type=...
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const type = request.nextUrl.searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (type && CREATIVE_TYPES.includes(type as (typeof CREATIVE_TYPES)[number])) {
      where.creativeType = type;
    }

    const references = await prisma.reference.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

    const ref = await prisma.reference.create({
      data: {
        imageUrl: parsed.data.imageUrl,
        creativeType: parsed.data.creativeType,
        label: parsed.data.label || null,
      },
    });

    return NextResponse.json(ref, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/references error:", err);
    return NextResponse.json({ error: "Помилка збереження" }, { status: 500 });
  }
}

// DELETE /api/admin/references  { id }
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
