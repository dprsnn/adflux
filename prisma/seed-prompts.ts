import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

const prompts = [
  {
    key: "text_generation",
    name: "Генерація текстів для банера",
    description: "Промпт для Claude API. Плейсхолдери: {{typePrompt}}, {{productContext}}, {{userWishes}}",
    content: `Ти — досвідчений копірайтер для платної реклами (Facebook, Instagram, Google Ads). Твоя задача — написати 4 варіації продаючих текстів для рекламного банера.

{{typePrompt}}

{{productContext}}
{{userWishes}}

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
}`,
  },
  {
    key: "image_generation",
    name: "Генерація зображення креативу",
    description: "Промпт для fal.ai (Flux). Плейсхолдери: {{headline}}, {{body}}, {{cta}}, {{productName}}, {{brandName}}, {{creativeTypeDescription}}",
    content: `Professional advertising creative banner for Meta (Facebook/Instagram) paid ads campaign.

CREATIVE LAYOUT — {{creativeTypeDescription}}:
The banner must follow this exact visual hierarchy from top to bottom:
1. HEADLINE ZONE (top 25%) — Bold, high-contrast headline text: "{{headline}}"
2. HERO PRODUCT ZONE (center 40%) — The product is the focal point, shot in commercial photography style, cleanly integrated into the scene with natural lighting and soft shadows. The product must look premium, tangible, and desirable.
3. BODY TEXT ZONE (below product, 20%) — Supporting copy: "{{body}}"
4. CTA ZONE (bottom 15%) — Prominent call-to-action button or banner strip: "{{cta}}"

PRODUCT: {{productName}} by {{brandName}}

VISUAL STYLE REQUIREMENTS:
- Aspect ratio: 3:4 (1080×1440px) — standard Meta ad format
- Commercial advertising photography quality — studio lighting, sharp focus
- Modern, clean, minimalist advertising design with generous whitespace
- Color palette: derived from the product and reference image
- Typography: large bold sans-serif headlines, clean readable body text
- All text must be CRISP, SHARP, and PERFECTLY READABLE — this is critical
- Text must have sufficient contrast against the background (use overlays/shadows if needed)
- The product must appear REAL, PHOTOREALISTIC — not illustrated or cartoonish
- Professional color grading with subtle gradients
- Subtle depth-of-field effect on background to keep product in focus
- No watermarks, no stock photo artifacts, no AI artifacts

COMPOSITION RULES:
- Visual weight concentrated in the center (product hero)
- Clear reading flow: headline → product → body → CTA
- Sufficient padding/margins on all sides (safe zone for Meta ads)
- CTA button must stand out with contrasting color
- Overall mood: trustworthy, premium, conversion-focused`,
  },
];

async function main() {
  for (const p of prompts) {
    await prisma.prompt.upsert({
      where: { key: p.key },
      update: { name: p.name, content: p.content, description: p.description },
      create: p,
    });
    console.log(`✓ ${p.key}`);
  }
}

main()
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
