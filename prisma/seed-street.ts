import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: "street" },
    update: {},
    create: {
      name: "Street",
      slug: "street",
      description:
        "Вуличні креативи — товар у міському середовищі з людьми та архітектурою",
    },
  });

  console.log("Category:", category.id, category.name);

  const existing = await prisma.template.findFirst({
    where: { name: "Пішохідний перехід (аеро)", categoryId: category.id },
  });

  if (existing) {
    const updated = await prisma.template.update({
      where: { id: existing.id },
      data: { promptTemplate: PROMPT },
    });
    console.log("Template updated:", updated.id, updated.name);
  } else {
    const created = await prisma.template.create({
      data: {
        name: "Пішохідний перехід (аеро)",
        categoryId: category.id,
        description:
          "Гігантський товар лежить на пішохідному переході, знятий зверху. Навколо йдуть крихітні люди — створює вау-ефект масштабу.",
        promptTemplate: PROMPT,
        requiresImage: true,
        isActive: true,
      },
    });
    console.log("Template created:", created.id, created.name);
  }
}

const PROMPT = `Hyper-realistic aerial photograph taken from directly above a busy urban crosswalk. A giant pair of {{product_name}} sneakers rests on the zebra crossing, spanning several lanes. The shoes are enormous compared to the tiny pedestrians walking around and across the crosswalk beneath and beside them. The sneakers must look exactly like a real product photo — accurate colors, materials, stitching, laces, and branding details for {{brand_name}}. The city pavement is dark grey asphalt with crisp white crosswalk stripes. Dozens of small people are scattered naturally — some crossing, some stopping to look up at the giant shoes. Top-down bird's-eye perspective, no horizon visible. Photorealistic urban street photography style, natural daylight, sharp focus on both the shoes and the miniature crowd, slight depth-of-field haze at the edges. Editorial advertising campaign look, magazine quality.`;

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
