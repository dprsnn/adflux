import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const analyzeProductSchema = z.object({
  productId: z.string().min(1, "productId обов'язковий"),
  url: z.string().url().nullable().optional(),
});

async function callClaudeWithRetry(
  messages: Anthropic.MessageCreateParams["messages"],
  maxRetries = 3
): Promise<Anthropic.Message> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages,
      });
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = rateLimit(`products:analyze:${user.id}`, { windowMs: 60_000, max: 3 });
  if (!success) {
    return NextResponse.json(
      { error: "Забагато запитів на аналіз. Зачекайте хвилину." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = analyzeProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Невалідні дані" },
      { status: 400 }
    );
  }

  const { productId, url } = parsed.data;

  const product = await prisma.product.findFirst({
    where: { id: productId, brand: { userId: user.id } },
    include: { brand: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Товар не знайдено" }, { status: 404 });
  }

  await prisma.product.update({
    where: { id: productId },
    data: { status: "ANALYZING" },
  });

  try {
    const brandContext = `Бренд: ${product.brand.name}`;

    let pageContent = "";
    if (url) {
      try {
        const siteResponse = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; AdFlux/1.0; Product Analyzer)",
          },
          signal: AbortSignal.timeout(15000),
        });
        if (siteResponse.ok) {
          const html = await siteResponse.text();
          pageContent = html.slice(0, 30000);
        }
      } catch {
        // Continue without page content if fetch fails
      }
    }

    const urlContext = url
      ? `
URL сторінки товару: ${url}
${pageContent ? `\nHTML-контент сторінки товару (обрізаний):\n${pageContent}` : "\n(Не вдалося завантажити сторінку, аналізуй на основі наявних даних)"}`
      : "";

    const message = await callClaudeWithRetry([
      {
        role: "user",
        content: `Ти — маркетинговий аналітик. Проаналізуй товар та створи стислий Product DNA.

${brandContext}

Товар: "${product.name}"
Опис товару: ${product.description || "не вказано"}
Поточна ціна: ${product.price || "не вказано"}
${urlContext}

Створи JSON з полями:

{
  "price": "Ціна товару (знайди на сторінці або використай вказану; формат: '1 299 ₴'). Якщо ціну не вдалося знайти — null",
  "tone": "Тон комунікації бренду/товару (1-3 слова, наприклад: дружній та експертний)",
  "targetSegments": "1-2 конкретних сегменти ЦА з демографією та мотивацією",
  "painPoints": "2-4 ключових болі ЦА, стисло",
  "benefits": "3-5 конкретних переваг-фактів (не маркетингові кліше, а реальні характеристики)",
  "mainObjection": "Одне головне заперечення ЦА та коротка відповідь на нього"
}

Відповідай ТІЛЬКИ валідним JSON без markdown-обгортки. Всі тексти — українською мовою.`,
      },
    ]);

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("Немає відповіді від AI");
    }

    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const productDna = JSON.parse(jsonText);

    const extractedPrice = productDna.price ?? null;
    delete productDna.price;

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        productDna,
        ...(extractedPrice && !product.price && { price: extractedPrice }),
        status: "READY",
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    await prisma.product.update({
      where: { id: productId },
      data: { status: "DRAFT" },
    });

    console.error("Product analysis error:", err);
    const errMessage =
      err instanceof Error ? err.message : "Помилка аналізу товару";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
