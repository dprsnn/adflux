import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = rateLimit(`generate:texts:${user.id}`, {
      windowMs: 60_000,
      max: 5,
    });
    if (!success) {
      return NextResponse.json(
        { error: "Забагато запитів. Зачекайте хвилину." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { product, templates, customInstructions } = body;

    if (!product || !templates || !Array.isArray(templates) || templates.length === 0) {
      return NextResponse.json(
        { error: "product і templates обов'язкові" },
        { status: 400 }
      );
    }

    // Build product context
    const dna = product.productDna as Record<string, unknown> | null;

    let productContext = `Товар: "${product.name}"`;
    if (product.description) productContext += `\nОпис: ${product.description}`;
    if (product.price) productContext += `\nЦіна: ${product.price}`;
    if (product.promotion) productContext += `\nАктивна акція: ${product.promotion}`;
    productContext += `\nБренд: ${product.brandName}`;

    if (dna) {
      if (dna.tone) productContext += `\n\nТон комунікації: ${dna.tone}`;
      if (dna.targetSegments) productContext += `\nЦільові сегменти: ${dna.targetSegments}`;
      if (dna.painPoints) productContext += `\nБолі ЦА: ${dna.painPoints}`;
      if (dna.benefits) productContext += `\nПереваги товару: ${dna.benefits}`;
      if (dna.mainObjection) productContext += `\nГоловне заперечення: ${dna.mainObjection}`;
    }

    const userWishes = customInstructions
      ? `\nДОДАТКОВІ ПОБАЖАННЯ ЗАМОВНИКА (обов'язково врахуй): ${customInstructions}`
      : "";

    // Build template descriptions
    const templateDescriptions = templates
      .map(
        (t: { label: string; textHint: string | null }, i: number) =>
          `ШАБЛОН ${i + 1} "${t.label || `Шаблон ${i + 1}`}": ${t.textHint || "Стандартний рекламний макет з заголовком, основним текстом та CTA."}`
      )
      .join("\n\n");

    const prompt = `Ти — досвідчений копірайтер для платної реклами (Facebook, Instagram, Google Ads). Твоя задача — написати продаючі тексти для рекламних банерів.

${productContext}
${userWishes}

Тобі дано ${templates.length} шаблонів банерів. Для КОЖНОГО шаблону напиши текст, який ідеально вписується в його структуру:

${templateDescriptions}

ПРАВИЛА:
1. Всі тексти — ВИКЛЮЧНО українською мовою
2. Headline — максимум 8 слів, має чіпляти з першого погляду
3. Body — 1-3 коротких речення, конкретика, без води
4. CTA — 2-5 слів, дієслівний
5. Кожен текст УНІКАЛЬНИЙ — різні кути подачі для різних шаблонів
6. Текст повинен ВПИСУВАТИСЬ у конкретний шаблон за стилем та обсягом
7. Не використовуй кліше типу "найкращий", "унікальний", "інноваційний"
8. Якщо є ціна або акція — використовуй їх де доречно

Відповідай ТІЛЬКИ валідним JSON без markdown-обгортки:
{
  "variations": [
    ${templates.map((_: unknown, i: number) => `{ "templateIndex": ${i}, "headline": "...", "body": "...", "cta": "..." }`).join(",\n    ")}
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
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
  } catch (err) {
    console.error("POST /api/generate/texts error:", err);
    const msg = err instanceof Error ? err.message : "Помилка генерації текстів";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
