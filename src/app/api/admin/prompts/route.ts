import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/admin/prompts
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const prompts = await prisma.prompt.findMany({
      orderBy: { key: "asc" },
    });

    return NextResponse.json(prompts);
  } catch (err) {
    console.error("GET /api/admin/prompts error:", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// PATCH /api/admin/prompts  { id, content }
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, content } = await request.json();

    if (!id || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
    }

    const prompt = await prisma.prompt.update({
      where: { id },
      data: { content: content.trim() },
    });

    return NextResponse.json(prompt);
  } catch (err) {
    console.error("PATCH /api/admin/prompts error:", err);
    return NextResponse.json({ error: "Помилка збереження" }, { status: 500 });
  }
}
