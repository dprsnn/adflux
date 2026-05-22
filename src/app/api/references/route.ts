import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/references — all templates for authenticated users
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const references = await prisma.reference.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        imageUrl: true,
        categoryId: true,
        category: { select: { name: true, slug: true } },
        label: true,
        imagePrompt: true,
        textHint: true,
      },
    });

    return NextResponse.json(references);
  } catch (err) {
    console.error("GET /api/references error:", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
