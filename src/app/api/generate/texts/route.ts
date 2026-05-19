import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CREATIVE_TYPE_PROMPTS: Record<string, string> = {
  conversion: `Тип макету: КОНВЕРСІЙНИЙ (Проблема → Рішення → CTA).
Структура кожної варіації:
- headline: гострий заголовок, що зачіпає біль / проблему аудиторії (до 8 слів)
- body: 1-2 речення — як товар вирішує цю проблему, конкретна перевага
- cta: заклик до дії — короткий, дієслівний, що створює терміновість`,

  social_proof: `Тип макету: СОЦІАЛЬНИЙ ДОКАЗ (Цитата → Деталь → Довіра).
Структура кожної варіації:
- headline: цитата-відгук від імені клієнта (від першої особи, реалістично, з емоцією)
- body: деталь — конкретний результат або факт, що підкріплює цитату
- cta: елемент довіри + м'який заклик (напр. "Приєднуйся до 5000+ задоволених клієнтів")`,

  promo: `Тип макету: ПРОМО (Оффер + дедлайн + вигода).
Структура кожної варіації:
- headline: яскравий оффер — знижка, подарунок, спеціальна ціна (великий, помітний)
- body: вигода для покупця + обмеження в часі / кількості (FOMO-тригер)
- cta: терміновий заклик до дії з дедлайном або лічильником`,

  ugc: `Тип макету: UGC / НАТИВНИЙ (органічний стиль).
Структура кожної варіації:
- headline: неформальний заголовок як у пості блогера — з емоцією, розмовний стиль
- body: коротка історія або враження від використання товару, ніби пише реальна людина
- cta: м'який, нативний заклик — без агресії, ніби порада другу`,
};

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
    const { product, creativeType, customInstructions } = body;

    if (!product || !creativeType) {
      return NextResponse.json(
        { error: "product і creativeType обов'язкові" },
        { status: 400 }
      );
    }

    const typePrompt = CREATIVE_TYPE_PROMPTS[creativeType];
    if (!typePrompt) {
      return NextResponse.json(
        { error: "Невідомий тип креативу" },
        { status: 400 }
      );
    }

    // Build product context from DNA + basic info
    const dna = product.productDna as Record<string, unknown> | null;

    let productContext = `Товар: "${product.name}"`;
    if (product.description)
      productContext += `\nОпис: ${product.description}`;
    if (product.price) productContext += `\nЦіна: ${product.price}`;
    if (product.promotion)
      productContext += `\nАктивна акція: ${product.promotion}`;
    productContext += `\nБренд: ${product.brandName}`;

    if (dna) {
      if (dna.painPoints)
        productContext += `\n\nБолі ЦА: ${dna.painPoints}`;
      if (dna.benefits)
        productContext += `\nПереваги товару: ${dna.benefits}`;
      if (dna.uniqueSellingPoints)
        productContext += `\nУТП: ${dna.uniqueSellingPoints}`;
      if (dna.targetSegments)
        productContext += `\nЦільові сегменти: ${dna.targetSegments}`;
      if (dna.emotionalTriggers)
        productContext += `\nЕмоційні тригери: ${dna.emotionalTriggers}`;
      if (dna.objections)
        productContext += `\nЗаперечення та відповіді: ${dna.objections}`;
      if (Array.isArray(dna.slogans) && dna.slogans.length > 0)
        productContext += `\nІснуючі слогани: ${dna.slogans.join("; ")}`;
      if (Array.isArray(dna.callToActions) && dna.callToActions.length > 0)
        productContext += `\nІснуючі CTA: ${dna.callToActions.join("; ")}`;
      if (Array.isArray(dna.keywords) && dna.keywords.length > 0)
        productContext += `\nКлючові слова: ${dna.keywords.join(", ")}`;
    }

    const userWishes = customInstructions
      ? `\n\nДОДАТКОВІ ПОБАЖАННЯ ЗАМОВНИКА (обов'язково врахуй):\n${customInstructions}`
      : "";

    const prompt = `Ти — досвідчений копірайтер для платної реклами (Facebook, Instagram, Google Ads). Твоя задача — написати 4 варіації продаючих текстів для рекламного банера.

${typePrompt}

${productContext}
${userWishes}

ПРАВИЛА:
1. Всі тексти — ВИКЛЮЧНО українською мовою
2. Headline — максимум 8 слів, має чіпляти з першого погляду
3. Body — 1-3 коротких речення, конкретика, без води
4. CTA — 2-5 слів, дієслівний, створює бажання діяти
5. Кожна варіація повинна бути УНІКАЛЬНОЮ — різні кути подачі, різні болі, різні тригери
6. Пиши як для людини, що скролить стрічку — у тебе 1.5 секунди привернути увагу
7. Не використовуй кліше типу "найкращий", "унікальний", "інноваційний" — будь конкретним
8. Якщо є ціна або акція — використовуй їх як тригер де доречно

Відповідай ТІЛЬКИ валідним JSON без markdown-обгортки у форматі:
{
  "variations": [
    { "headline": "...", "body": "...", "cta": "..." },
    { "headline": "...", "body": "...", "cta": "..." },
    { "headline": "...", "body": "...", "cta": "..." },
    { "headline": "...", "body": "...", "cta": "..." }
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
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonText);

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/generate/texts error:", err);
    const msg =
      err instanceof Error ? err.message : "Помилка генерації текстів";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
