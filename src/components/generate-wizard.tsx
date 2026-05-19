"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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
  ArrowRight,
  Megaphone,
  Quote,
  Zap,
  Users,
  Package,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  price: string | null;
  promotion: string | null;
  imageUrls: string[];
  brand: { name: string };
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

  const [productId, setProductId] = useState<string>(
    preselectedProductId ?? ""
  );
  const [creativeType, setCreativeType] = useState<CreativeType | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");

  const selectedProduct = products.find((p) => p.id === productId);
  const canProceed = !!productId && !!creativeType;

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

      {/* Step 1: Product selection */}
      <div className="space-y-6">
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

        {/* Step 2: Creative type */}
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

        {/* Step 3: Custom instructions */}
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

        {/* Selected product promo hint */}
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
          <Button size="lg" disabled={!canProceed}>
            Далі
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
