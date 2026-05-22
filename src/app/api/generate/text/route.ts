import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PROMPT_KEY = "ab_copywriter";

const FALLBACK_SYSTEM_PROMPT = `You are an experienced performance copywriter for paid Meta (Facebook / Instagram) ads.

TASK: Generate ad-copy variants based on the Product DNA and the list of items
provided by the user. Each item has a backgroundId and a creativeType.
Generate ONE text per item, matching its creativeType.

CREATIVE TYPES:
- conversion — pain → solution (USP) → clear offer; confident direct CTA.
- social_proof — trust & handling the main objection; sense of "many people choose this", reviews/experience.
- promo — deal/benefit front-and-center, light urgency, mention price/promotion if present in DNA.
- ugc — lively first-person conversational tone, minimal "advertising feel", as if advice from a real person.

Texts of different types MUST noticeably differ in angle — they should not feel similar.

RULES:
- LANGUAGE: respond in the SAME language the Product DNA is written in. Do NOT switch languages.
- Use Product DNA as a SOURCE OF INSIGHTS — do NOT copy its wording verbatim; rephrase for each creative. For each text pick the most relevant pain/segment, do not list all of them.
- Follow the TONE from DNA, but adapt per type (e.g., UGC is always more casual).
- headline: short, catchy; body: 1–3 sentences; cta: 2–4 words.
- Avoid clichés ("best", "unique", "innovative") — be specific.
- If price or promotion exists in DNA — use where appropriate (especially promo type).

OUTPUT: strict JSON, no preamble, no markdown fences. Return items in the SAME ORDER as the input:
{
  "items": [
    { "backgroundId": "...", "type": "...", "headline": "...", "body": "...", "cta": "..." },
    ...
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = rateLimit(`generate:text:${user.id}`, {
      windowMs: 60_000,
      max: 5,
    });
    if (!success) {
      return NextResponse.json(
        { error: "Забагато запитів. Зачекайте хвилину." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const {
      productName,
      productDescription,
      brandName,
      productDna,
      userConstraints,
      items,
    } = body;

    if (!productName) {
      return NextResponse.json(
        { error: "productName обов'язковий" },
        { status: 400 },
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items обов'язковий (масив фонів з типами)" },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    //  Load system prompt from DB
    // ------------------------------------------------------------------

    let systemPrompt: string;
    try {
      const dbPrompt = await prisma.prompt.findUnique({
        where: { key: PROMPT_KEY },
      });
      systemPrompt = dbPrompt?.content || FALLBACK_SYSTEM_PROMPT;
    } catch {
      systemPrompt = FALLBACK_SYSTEM_PROMPT;
    }

    // ------------------------------------------------------------------
    //  Build product context from DNA
    // ------------------------------------------------------------------

    const dna = productDna as Record<string, unknown> | null;

    let productContext = `PRODUCT: "${productName}"`;
    if (productDescription) productContext += `\nDescription: ${productDescription}`;
    if (brandName) productContext += `\nBrand: ${brandName}`;

    if (dna) {
      productContext += "\n\n--- PRODUCT DNA ---";
      if (dna.tone) productContext += `\nTone: ${dna.tone}`;
      if (dna.targetSegments) productContext += `\nTarget segments: ${dna.targetSegments}`;
      if (dna.painPoints) productContext += `\nPain points: ${dna.painPoints}`;
      if (dna.benefits) productContext += `\nBenefits (facts): ${dna.benefits}`;
      if (dna.mainObjection) productContext += `\nMain objection: ${dna.mainObjection}`;
      if (dna.price) productContext += `\nPrice: ${dna.price}`;
      if (dna.promotion) productContext += `\nPromotion: ${dna.promotion}`;
    }

    // ------------------------------------------------------------------
    //  Items list
    // ------------------------------------------------------------------

    const itemsList = (items as { backgroundId: string; creativeType: string }[])
      .map(
        (item, i) =>
          `${i + 1}. backgroundId="${item.backgroundId}", creativeType="${item.creativeType}"`,
      )
      .join("\n");

    // ------------------------------------------------------------------
    //  Constraints
    // ------------------------------------------------------------------

    const constraintsBlock = userConstraints
      ? `\n\n=== CONSTRAINTS (HIGHEST PRIORITY — override everything else, apply to ALL texts) ===\n${userConstraints}\n=== END CONSTRAINTS ===`
      : "";

    // ------------------------------------------------------------------
    //  Call Claude
    // ------------------------------------------------------------------

    const userMessage = `${productContext}\n\n--- ITEMS (generate one text per item) ---\n${itemsList}${constraintsBlock}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
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

    // ------------------------------------------------------------------
    //  Post-processing: check for banned words
    // ------------------------------------------------------------------

    const resultItems: unknown[] = result.items || result.variants || [];

    if (userConstraints && Array.isArray(resultItems)) {
      const bannedMatch = userConstraints.match(
        /(?:не вживати|заборон(?:ені|ено|ити)|не використовувати|забороняється|banned|forbidden|don'?t use)[:\s]+[«"']?([^»"'\n]+)[»"']?/gi,
      );

      if (bannedMatch) {
        const bannedWords = bannedMatch
          .flatMap((m: string) => {
            const after = m.replace(/^[^:]+:\s*/, "");
            return after.split(/[,;]/).map((w: string) => w.trim().replace(/[«»"']/g, "").toLowerCase());
          })
          .filter(Boolean);

        if (bannedWords.length > 0) {
          for (const item of resultItems as Record<string, unknown>[]) {
            const combined = `${item.headline} ${item.body} ${item.cta}`.toLowerCase();
            const found = bannedWords.filter((w: string) => combined.includes(w));
            if (found.length > 0) {
              item.needsReview = true;
              item.reviewReason = `Можливе вживання заборонених слів: ${found.join(", ")}`;
            }
          }
        }
      }
    }

    return NextResponse.json({
      items: resultItems,
      promptUsed: userMessage,
    });
  } catch (err) {
    console.error("POST /api/generate/text error:", err);
    const msg = err instanceof Error ? err.message : "Помилка генерації текстів";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
