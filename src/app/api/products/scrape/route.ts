import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const scrapeSchema = z.object({
  url: z.string().url("Невалідний URL"),
  brandId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = rateLimit(`products:scrape:${user.id}`, { windowMs: 60_000, max: 5 });
  if (!success) {
    return NextResponse.json(
      { error: "Забагато запитів. Зачекайте хвилину." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = scrapeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Невалідні дані" },
      { status: 400 }
    );
  }

  const { url } = parsed.data;

  try {
    let pageContent = "";
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
      return NextResponse.json(
        { error: "Не вдалося завантажити сторінку. Перевірте URL." },
        { status: 400 }
      );
    }

    if (!pageContent) {
      return NextResponse.json(
        { error: "Сторінка порожня або недоступна." },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Проаналізуй HTML сторінки товару та витягни всю інформацію.

URL: ${url}

HTML-контент (обрізаний):
${pageContent}

Створи JSON з полями:

{
  "name": "Назва товару",
  "description": "Короткий опис товару (2-3 речення)",
  "price": "Ціна (формат: '1 299 ₴') або null",
  "tone": "Тон комунікації бренду/товару (1-3 слова)",
  "targetSegments": "1-2 конкретних сегменти ЦА з демографією та мотивацією",
  "painPoints": "2-4 ключових болі ЦА, стисло",
  "benefits": "3-5 конкретних переваг-фактів товару",
  "mainObjection": "Одне головне заперечення ЦА та коротка відповідь",
  "imageUrls": ["url1", "url2"] — масив URL фото товару зі сторінки (до 5 штук, тільки прямі посилання на зображення товару)
}

Відповідай ТІЛЬКИ валідним JSON без markdown-обгортки. Всі тексти — українською мовою.`,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("Немає відповіді від AI");
    }

    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonText);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Product scrape error:", err);
    const errMessage =
      err instanceof Error ? err.message : "Помилка зчитування товару";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
