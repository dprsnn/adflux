import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchAsFile(url: string, name: string): Promise<File> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/png" });
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

/* ------------------------------------------------------------------ */
/*  Variation axis types                                               */
/* ------------------------------------------------------------------ */

/** A single axis value — either a plain string or an object with freeSide */
type AxisValue = string | { text: string; freeSide: string };

interface VariationAxis {
  name: string;
  promptKey: string;
  values: AxisValue[];
}

/* ------------------------------------------------------------------ */
/*  Default axes — used when referent has no variationAxes             */
/* ------------------------------------------------------------------ */

const DEFAULT_AXES: VariationAxis[] = [
  {
    name: "Колір",
    promptKey: "COLOR THEME",
    values: ["warm orange", "golden yellow", "deep red", "fresh green", "cool teal"],
  },
  {
    name: "Кут камери",
    promptKey: "CAMERA ANGLE",
    values: ["eye-level", "low angle looking up", "slight top-down 45°"],
  },
  {
    name: "Розташування",
    promptKey: "PLACEMENT",
    values: [
      { text: "product on the RIGHT side, props around it", freeSide: "left" },
      { text: "product on the LEFT side, props around it", freeSide: "right" },
      { text: "product centered, props low in foreground", freeSide: "top" },
      { text: "product centered, props on the sides", freeSide: "bottom" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Pick combos — one value per axis, no duplicate combos              */
/* ------------------------------------------------------------------ */

interface PickedCombo {
  /** axis name → picked value */
  picks: Record<string, { promptKey: string; raw: AxisValue; text: string; freeSide?: string }>;
}

function pickCombos(axes: VariationAxis[], count: number): PickedCombo[] {
  // Build cartesian product
  function cartesian(axIdx: number): Record<string, { promptKey: string; raw: AxisValue; text: string; freeSide?: string }>[] {
    if (axIdx >= axes.length) return [{}];
    const axis = axes[axIdx];
    const rest = cartesian(axIdx + 1);
    const result: Record<string, { promptKey: string; raw: AxisValue; text: string; freeSide?: string }>[] = [];
    for (const val of axis.values) {
      const text = typeof val === "string" ? val : val.text;
      const freeSide = typeof val === "object" ? val.freeSide : undefined;
      for (const r of rest) {
        result.push({ ...r, [axis.name]: { promptKey: axis.promptKey, raw: val, text, freeSide } });
      }
    }
    return result;
  }

  const combos = cartesian(0);

  // Shuffle
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }

  const result: PickedCombo[] = [];
  for (let i = 0; i < count; i++) {
    result.push({ picks: combos[i % combos.length] });
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Response type                                                      */
/* ------------------------------------------------------------------ */

interface ImageVariantResult {
  imageUrl: string;
  seed: number;
  textZone: string;
  promptUsed: string;
  variation: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = rateLimit(`generate:image:${user.id}`, {
      windowMs: 60_000,
      max: 10,
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
      productImageUrl,
      templateImageUrl,
      templateImagePrompt,
      count: rawCount,
      model: requestedModel,
    } = body;

    const model =
      requestedModel === "gpt-image-2" ? "gpt-image-2" : "gpt-image-1";
    const count = rawCount === 4 ? 4 : 2;

    if (!productImageUrl) {
      return NextResponse.json(
        { error: "productImageUrl обов'язковий" },
        { status: 400 },
      );
    }
    if (!productName) {
      return NextResponse.json(
        { error: "productName обов'язковий" },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    //  Parse referent → basePrompt + variationAxes
    // ------------------------------------------------------------------

    let basePrompt: string;
    let axes: VariationAxis[] = DEFAULT_AXES.map((a) => ({
      ...a,
      values: a.values.map((v) => (typeof v === "string" ? v : { ...v })),
    }));

    if (templateImagePrompt) {
      try {
        const parsed = JSON.parse(templateImagePrompt);
        if (parsed.basePrompt) {
          basePrompt = parsed.basePrompt;
          if (Array.isArray(parsed.variationAxes) && parsed.variationAxes.length > 0) {
            axes = parsed.variationAxes;
          }
        } else {
          basePrompt = templateImagePrompt;
        }
      } catch {
        basePrompt = templateImagePrompt;
      }
    } else {
      basePrompt = `Professional advertising product photography for Meta ads (portrait 3:4, 1080×1440).
Product: ${productName}${brandName ? ` by ${brandName}` : ""}.${productDescription ? ` ${productDescription}` : ""}
Modern, clean, premium commercial photography style.
Studio lighting, sharp focus, subtle depth-of-field on background.
Place the product naturally with relevant props and decorative elements.`;
    }

    // Apply placeholders
    basePrompt = basePrompt
      .replace(/\{\{productName\}\}/g, productName)
      .replace(/\{\{productDescription\}\}/g, productDescription || productName)
      .replace(/\{\{brandName\}\}/g, brandName || "");

    // ------------------------------------------------------------------
    //  Image context
    // ------------------------------------------------------------------

    let imageContext = "";
    if (templateImageUrl && productImageUrl) {
      imageContext = `TWO REFERENCE IMAGES PROVIDED:
IMAGE 1 — STYLE REFERENCE: Replicate this ad's visual style, color palette, lighting, background treatment and decorative elements. Ignore any text in this image.
IMAGE 2 — PRODUCT PHOTO: This is the product. Keep its appearance, shape, design and packaging text exactly unchanged.
`;
    } else {
      imageContext = `PRODUCT PHOTO PROVIDED: This is the product. Keep its appearance, shape, design and packaging text exactly unchanged.\n`;
    }

    // ------------------------------------------------------------------
    //  No-text rules
    // ------------------------------------------------------------------

    const noTextRules = `

Keep the provided product exactly as it is — do NOT redraw, restyle or relabel it; preserve its shape, design and packaging text.
Do NOT add any text, letters, numbers, words, logos or watermarks anywhere on the image.
The image must contain ONLY the product, background, and decorative/visual elements.
Photorealistic, vertical 3:4.`;

    // ------------------------------------------------------------------
    //  Pre-fetch image files once
    // ------------------------------------------------------------------

    const imageFiles: File[] = [];
    if (templateImageUrl) {
      imageFiles.push(await fetchAsFile(templateImageUrl, "template.png"));
    }
    imageFiles.push(await fetchAsFile(productImageUrl, "product.png"));

    // ------------------------------------------------------------------
    //  Pick combos & build prompts
    // ------------------------------------------------------------------

    const combos = pickCombos(axes, count);

    const variantJobs = combos.map((combo) => {
      const seed = randomSeed();

      // Find freeSide from any axis value that has it
      let freeSide: string | undefined;
      for (const pick of Object.values(combo.picks)) {
        if (pick.freeSide) {
          freeSide = pick.freeSide;
          break;
        }
      }
      const textZone = freeSide || "left";

      // 60/40 rule
      const compositionRule =
        `The product together with surrounding props must occupy no more than ~60% of the frame; ` +
        `keep the ${textZone} area clean and uncluttered — smooth gradient only — ` +
        `reserved as copy space for text added later.`;

      // Build axis directives
      const axisLines = Object.values(combo.picks)
        .map((p) => `${p.promptKey}: ${p.text}`)
        .join("\n");

      const finalPrompt =
        imageContext +
        basePrompt +
        "\n\n" +
        axisLines +
        "\n" +
        compositionRule +
        noTextRules;

      // Build variation record for response
      const variation: Record<string, string> = {};
      for (const [axisName, pick] of Object.entries(combo.picks)) {
        variation[axisName] = pick.text;
      }

      return { prompt: finalPrompt, seed, textZone, variation };
    });

    // ------------------------------------------------------------------
    //  Supabase client
    // ------------------------------------------------------------------

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // ------------------------------------------------------------------
    //  Generate all in parallel
    // ------------------------------------------------------------------

    async function generateOne(
      job: (typeof variantJobs)[number],
      attempt = 1,
    ): Promise<ImageVariantResult> {
      try {
        const result = await openai.images.edit({
          model,
          image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
          prompt: job.prompt,
          size: "1024x1536",
          quality: "high",
        });

        const imageData = result.data?.[0];
        if (!imageData?.b64_json) {
          throw new Error("Модель не повернула зображення");
        }

        const imageBuffer = Buffer.from(imageData.b64_json, "base64");
        const fileName = `creatives/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

        const { data: uploadData, error: uploadError } =
          await supabase.storage
            .from("brands")
            .upload(fileName, imageBuffer, {
              contentType: "image/png",
              upsert: true,
            });

        let imageUrl: string;
        if (uploadError) {
          console.error("Supabase upload error:", uploadError);
          imageUrl = `data:image/png;base64,${imageData.b64_json}`;
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("brands").getPublicUrl(uploadData.path);
          imageUrl = publicUrl;
        }

        return {
          imageUrl,
          seed: job.seed,
          textZone: job.textZone,
          promptUsed: job.prompt,
          variation: job.variation,
        };
      } catch (err) {
        if (attempt < 2) {
          return generateOne(job, attempt + 1);
        }
        throw err;
      }
    }

    const results = await Promise.allSettled(
      variantJobs.map((job) => generateOne(job)),
    );

    const variants: ImageVariantResult[] = [];
    const errors: string[] = [];

    for (const r of results) {
      if (r.status === "fulfilled") {
        variants.push(r.value);
      } else {
        const msg =
          r.reason instanceof Error ? r.reason.message : "Помилка генерації";
        errors.push(msg);
      }
    }

    if (variants.length === 0) {
      return NextResponse.json(
        { error: errors[0] || "Жодне зображення не згенеровано" },
        { status: 500 },
      );
    }

    // Self-check
    const promptSet = new Set(variants.map((v) => v.promptUsed));
    if (promptSet.size < variants.length) {
      console.warn(
        `[generate/image] WARNING: ${variants.length - promptSet.size} duplicate prompts among ${variants.length} variants`,
      );
    }

    return NextResponse.json({
      variants,
      ...(errors.length > 0 && { errors }),
    });
  } catch (err) {
    console.error("POST /api/generate/image error:", err);
    const msg =
      err instanceof Error ? err.message : "Помилка генерації зображення";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
