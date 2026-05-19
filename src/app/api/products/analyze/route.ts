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
        max_tokens: 2000,
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

  // Rate limit: 3 product analyses per minute
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

  // Get product with brand data
  const product = await prisma.product.findFirst({
    where: { id: productId, brand: { userId: user.id } },
    include: { brand: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Товар не знайдено" }, { status: 404 });
  }

  // Update status to ANALYZING
  await prisma.product.update({
    where: { id: productId },
    data: { status: "ANALYZING" },
  });

  try {
    const brandContext = `Бренд: ${product.brand.name}`;

    // If URL provided, fetch the page content
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
        content: `Ти — маркетинговий аналітик. Проаналізуй товар та створи Product DNA документ.

${brandContext}

Товар: "${product.name}"
Опис товару: ${product.description || "не вказано"}
Поточна ціна: ${product.price || "не вказано"}
${urlContext}

Створи структурований JSON-документ Product DNA з наступними полями:

{
  "price": "Ціна товару (знайди на сторінці або використай вказану; формат: '1 299 ₴'). Якщо ціну не вдалося знайти — null",
  "painPoints": "Болі та потреби цільової аудиторії щодо цього товару (3-5 пунктів)",
  "benefits": "Переваги та ключові характеристики товару (3-5 пунктів)",
  "uniqueSellingPoints": "Унікальні торгові пропозиції (2-3 пункти)",
  "slogans": ["Рекламний слоган 1", "Рекламний слоган 2", "Рекламний слоган 3"],
  "callToActions": ["CTA 1", "CTA 2", "CTA 3"],
  "objections": "Можливі заперечення клієнтів та відповіді на них (2-3 пункти)",
  "targetSegments": "Конкретні сегменти аудиторії для цього товару",
  "emotionalTriggers": "Емоційні тригери для реклами (2-3 пункти)",
  "keywords": ["ключове слово 1", "ключове слово 2", "ключове слово 3", "ключове слово 4", "ключове слово 5"]
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

    // Extract price from DNA if found, then remove it from DNA object
    const extractedPrice = productDna.price ?? null;
    delete productDna.price;

    // Save Product DNA + price
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
    // Revert status on error
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
