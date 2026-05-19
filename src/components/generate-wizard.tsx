"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Megaphone,
  Quote,
  Zap,
  Users,
  Package,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { AnalysisLoader } from "@/components/analysis-loader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CreativeType = "conversion" | "social_proof" | "promo" | "ugc";

interface CreativeTypeOption {
  id: CreativeType;
  label: string;
  structure: string;
  description: string;
  icon: React.ElementType;
}

const CREATIVE_TYPES: CreativeTypeOption[] = [
  {
    id: "conversion",
    label: "Конверсійний",
    structure: "Проблема → Рішення → CTA",
    description:
      "Класичний продаючий макет. Зачіпає біль аудиторії, показує товар як рішення та підштовхує до дії.",
    icon: Megaphone,
  },
  {
    id: "social_proof",
    label: "Соціальний доказ",
    structure: "Цитата → Деталь → Довіра",
    description:
      "Відгук або цитата реального клієнта, підкріплена деталями та елементами довіри.",
    icon: Quote,
  },
  {
    id: "promo",
    label: "Промо",
    structure: "Оффер + дедлайн + вигода",
    description:
      "Акційний макет з яскравим оффером, обмеженням у часі та чіткою вигодою для покупця.",
    icon: Zap,
  },
  {
    id: "ugc",
    label: "UGC / Нативний",
    structure: "Нативний стиль",
    description:
      "Виглядає як органічний пост у стрічці — без агресивної реклами, максимально нативно.",
    icon: Users,
  },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  promotion: string | null;
  productDna: unknown;
  imageUrls: string[];
  brand: { name: string };
}

interface TextVariation {
  headline: string;
  body: string;
  cta: string;
}

interface GenerateWizardProps {
  products: Product[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GenerateWizard({ products }: GenerateWizardProps) {
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get("productId");

  // Step 0 state
  const [productId, setProductId] = useState<string>(
    preselectedProductId ?? ""
  );
  const [creativeType, setCreativeType] = useState<CreativeType | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");

  // Step navigation
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);

  // Step 1 state
  const [variations, setVariations] = useState<TextVariation[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<Set<number>>(
    new Set()
  );

  const selectedProduct = products.find((p) => p.id === productId);
  const canProceed = !!productId && !!creativeType;

  async function handleGenerate() {
    if (!selectedProduct || !creativeType) return;

    setGenerating(true);
    setStep(1);

    try {
      const res = await fetch("/api/generate/texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            name: selectedProduct.name,
            description: selectedProduct.description,
            price: selectedProduct.price,
            promotion: selectedProduct.promotion,
            productDna: selectedProduct.productDna,
            brandName: selectedProduct.brand.name,
          },
          creativeType,
          customInstructions: customInstructions || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Помилка генерації");
      }

      const data = await res.json();
      setVariations(data.variations);
      setSelectedVariations(new Set());
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Помилка генерації текстів"
      );
      setStep(0);
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    setVariations([]);
    setSelectedVariations(new Set());
    await handleGenerate();
  }

  function toggleVariation(index: number) {
    setSelectedVariations((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function updateVariation(
    index: number,
    field: keyof TextVariation,
    value: string
  ) {
    setVariations((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  const selectedTypeOption = CREATIVE_TYPES.find(
    (t) => t.id === creativeType
  );

  /* ---------------------------------------------------------------- */
  /*  Step 1 — Text variations                                        */
  /* ---------------------------------------------------------------- */
  if (step === 1) {
    return (
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(0)}
            disabled={generating}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Назад
          </Button>
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Тексти для банера
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedProduct?.brand.name} — {selectedProduct?.name}
              {selectedTypeOption && (
                <span className="ml-2 text-primary">
                  · {selectedTypeOption.label}
                </span>
              )}
            </p>
          </div>
          {!generating && variations.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Перегенерувати
            </Button>
          )}
        </div>

        {generating ? (
          <Card>
            <CardContent>
              <AnalysisLoader />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-3">
                <Check className="h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Оберіть варіації, які вам подобаються — для кожної обраної буде
                  згенеровано зображення
                </p>
              </CardContent>
            </Card>

            {variations.map((v, i) => {
              const isSelected = selectedVariations.has(i);
              return (
                <Card
                  key={i}
                  className={cn(
                    "relative transition-all",
                    isSelected
                      ? "border-primary shadow-sm"
                      : "border-border opacity-60"
                  )}
                >
                  {/* Selection toggle */}
                  <button
                    type="button"
                    onClick={() => toggleVariation(i)}
                    className={cn(
                      "absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 hover:border-primary/50"
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                  </button>

                  <CardHeader className="pb-3 pr-14">
                    <CardTitle className="text-sm text-muted-foreground">
                      Варіація {i + 1}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Заголовок
                      </Label>
                      <Input
                        value={v.headline}
                        onChange={(e) =>
                          updateVariation(i, "headline", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Основний текст
                      </Label>
                      <Textarea
                        value={v.body}
                        onChange={(e) =>
                          updateVariation(i, "body", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Заклик до дії (CTA)
                      </Label>
                      <Input
                        value={v.cta}
                        onChange={(e) =>
                          updateVariation(i, "cta", e.target.value)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Next step */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Обрано: {selectedVariations.size} з {variations.length}
                {selectedVariations.size > 0 && (
                  <span className="ml-1">
                    → {selectedVariations.size}{" "}
                    {selectedVariations.size === 1
                      ? "зображення"
                      : selectedVariations.size < 5
                        ? "зображення"
                        : "зображень"}
                  </span>
                )}
              </p>
              <Button
                size="lg"
                disabled={selectedVariations.size === 0}
              >
                Далі
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Step 0 — Product + type + instructions                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Створити креатив
        </h1>
        <p className="mt-1 text-muted-foreground">
          Оберіть товар, тип макету та додайте побажання
        </p>
      </div>

      <div className="space-y-6">
        {/* Product selection */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Товар</Label>
          {products.length === 0 ? (
            <Card>
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Немає готових товарів. Спочатку створіть товар та заповніть
                  Product DNA.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Оберіть товар...">
                  {selectedProduct
                    ? `${selectedProduct.brand.name} — ${selectedProduct.name}${selectedProduct.price ? ` (${selectedProduct.price})` : ""}`
                    : "Оберіть товар..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.brand.name} — {p.name}
                      {p.price && (
                        <span className="text-xs text-muted-foreground">
                          ({p.price})
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Creative type */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Тип креативу</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {CREATIVE_TYPES.map((type) => {
              const isSelected = creativeType === type.id;
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setCreativeType(type.id)}
                  className={cn(
                    "group relative rounded-xl border-2 p-4 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {type.label}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-primary/70">
                        {type.structure}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom instructions */}
        <div className="space-y-2">
          <Label htmlFor="instructions" className="text-base font-semibold">
            Побажання до текстів
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              необов&apos;язково
            </span>
          </Label>
          <Textarea
            id="instructions"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Наприклад: тематика свят, обмеження реклами медичних товарів, тон комунікації, конкретні фрази які треба використати..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Ці побажання вплинуть на генерацію всіх текстів креативу — заголовки,
            описи, CTA тощо.
          </p>
        </div>

        {/* Promo hint */}
        {selectedProduct?.promotion && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-3">
              <Zap className="h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm">
                <span className="font-medium">Активна акція:</span>{" "}
                {selectedProduct.promotion}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action */}
        <div className="flex justify-end pt-2">
          <Button size="lg" disabled={!canProceed} onClick={handleGenerate}>
            Далі
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
