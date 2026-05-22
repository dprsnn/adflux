"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImageIcon,
  Loader2,
  Package,
  AlertCircle,
  RefreshCw,
  Type,
  History,
  Trash2,
} from "lucide-react";
import { AnalysisLoader } from "@/components/analysis-loader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
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

interface Template {
  id: string;
  imageUrl: string;
  categoryId: string;
  category: { name: string; slug: string };
  label: string | null;
  imagePrompt: string | null;
  textHint: string | null;
}

interface ImageVariant {
  imageUrl: string;
  seed: number;
  textZone: string;
  promptUsed: string;
  variation: Record<string, string>;
}

type CreativeType = "conversion" | "social_proof" | "promo" | "ugc";

interface BackgroundSlot {
  variant: ImageVariant;
  templateLabel: string;
  creativeType: CreativeType;
  headline: string;
  body: string;
  cta: string;
  needsReview?: boolean;
  reviewReason?: string;
  confirmed: boolean;
  hasText: boolean;
}

interface GenerateWizardProps {
  products: Product[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CREATIVE_TYPES: { value: CreativeType; label: string; tag: string }[] = [
  { value: "conversion", label: "Конверсійний", tag: "Біль → Рішення → CTA" },
  { value: "social_proof", label: "Соціальний доказ", tag: "Довіра + заперечення" },
  { value: "promo", label: "Промо", tag: "Оффер + терміновість" },
  { value: "ugc", label: "UGC", tag: "Нативна порада" },
];

const DEFAULT_TYPE_ORDER: CreativeType[] = ["conversion", "social_proof", "promo", "ugc"];

const STORAGE_KEY = "adflux:generate:session";

/* ------------------------------------------------------------------ */
/*  Session persistence                                                */
/* ------------------------------------------------------------------ */

interface SavedSession {
  productId: string;
  imageModel: string;
  imageCount: number;
  selectedTemplateIds: string[];
  slots: BackgroundSlot[];
  userConstraints: string;
  savedAt: number;
}

function saveSession(data: SavedSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedSession;
    // Expire after 24 hours
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GenerateWizard({ products }: GenerateWizardProps) {
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get("productId");

  // Settings
  const [productId, setProductId] = useState(preselectedProductId ?? "");
  const [imageModel, setImageModel] = useState<"gpt-image-1" | "gpt-image-2">("gpt-image-1");
  const [imageCount, setImageCount] = useState<2 | 4>(2);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());

  // Navigation
  const [step, setStep] = useState(0);

  // Step 1 — images
  const [generatedImages, setGeneratedImages] = useState<
    Map<number, { variants: ImageVariant[]; loading: boolean; error: string | null }>
  >(new Map());

  // Step 1 — texts (inline with images)
  const [slots, setSlots] = useState<BackgroundSlot[]>([]);
  const [textsLoading, setTextsLoading] = useState(false);
  const [userConstraints, setUserConstraints] = useState("");

  // Saved session
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const slotsBuiltRef = useRef(false);

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedTemplates = templates.filter((t) => selectedTemplateIds.has(t.id));
  const canProceed = !!productId && selectedTemplateIds.size > 0;

  // Load saved session on mount
  useEffect(() => {
    const session = loadSession();
    if (session && session.slots.length > 0) {
      setSavedSession(session);
    }
  }, []);

  function restoreSession(session: SavedSession) {
    setProductId(session.productId);
    setImageModel(session.imageModel as "gpt-image-1" | "gpt-image-2");
    setImageCount(session.imageCount as 2 | 4);
    setSelectedTemplateIds(new Set(session.selectedTemplateIds));
    setSlots(session.slots);
    setUserConstraints(session.userConstraints);
    slotsBuiltRef.current = true;
    setStep(1);
    setSavedSession(null);
    toast.success("Сесію відновлено!");
  }

  function discardSession() {
    clearSession();
    setSavedSession(null);
  }

  // Auto-save when slots change
  useEffect(() => {
    if (slots.length > 0 && step === 1) {
      saveSession({
        productId,
        imageModel,
        imageCount,
        selectedTemplateIds: Array.from(selectedTemplateIds),
        slots,
        userConstraints,
        savedAt: Date.now(),
      });
    }
  }, [slots, userConstraints, step]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/references");
      if (!res.ok) throw new Error();
      setTemplates(await res.json());
    } catch {
      toast.error("Не вдалося завантажити шаблони");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      } else {
        toast.error("Максимум 4 шаблони");
      }
      return next;
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Build slots from generated images                                */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (step !== 1 || slotsBuiltRef.current) return;

    const allDone =
      selectedTemplates.length > 0 &&
      selectedTemplates.every((_, i) => {
        const img = generatedImages.get(i);
        return img && !img.loading;
      });

    if (!allDone) return;

    const newSlots: BackgroundSlot[] = [];
    for (let ti = 0; ti < selectedTemplates.length; ti++) {
      const img = generatedImages.get(ti);
      if (!img || img.error) continue;
      for (const variant of img.variants) {
        newSlots.push({
          variant,
          templateLabel: selectedTemplates[ti]?.label || `Шаблон ${ti + 1}`,
          creativeType: DEFAULT_TYPE_ORDER[newSlots.length % 4],
          headline: "",
          body: "",
          cta: "",
          confirmed: false,
          hasText: false,
        });
      }
    }

    if (newSlots.length > 0) {
      setSlots(newSlots);
      slotsBuiltRef.current = true;
    }
  }, [generatedImages, step, selectedTemplates]);

  /* ---------------------------------------------------------------- */
  /*  Generate images                                                  */
  /* ---------------------------------------------------------------- */

  async function generateImagesForTemplate(templateIndex: number) {
    const template = selectedTemplates[templateIndex];
    if (!template || !selectedProduct) return;

    setGeneratedImages((prev) => {
      const next = new Map(prev);
      next.set(templateIndex, { variants: [], loading: true, error: null });
      return next;
    });

    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: selectedProduct.name,
          productDescription: selectedProduct.description,
          brandName: selectedProduct.brand.name,
          productImageUrl: selectedProduct.imageUrls[0] || null,
          templateImageUrl: template.imageUrl,
          templateImagePrompt: template.imagePrompt,
          count: imageCount,
          model: imageModel,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Помилка генерації");
      }

      const data = await res.json();
      setGeneratedImages((prev) => {
        const next = new Map(prev);
        next.set(templateIndex, { variants: data.variants || [], loading: false, error: null });
        return next;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Помилка генерації";
      setGeneratedImages((prev) => {
        const next = new Map(prev);
        next.set(templateIndex, { variants: [], loading: false, error: msg });
        return next;
      });
    }
  }

  function handleGenerate() {
    setGeneratedImages(new Map());
    setSlots([]);
    slotsBuiltRef.current = false;
    setStep(1);
    for (let i = 0; i < selectedTemplates.length; i++) {
      generateImagesForTemplate(i);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Generate texts for all slots                                     */
  /* ---------------------------------------------------------------- */

  async function handleGenerateTexts() {
    if (!selectedProduct || slots.length === 0) return;
    setTextsLoading(true);

    try {
      const dna = selectedProduct.productDna as Record<string, unknown> | null;

      const items = slots.map((s, i) => ({
        backgroundId: String(i),
        creativeType: s.creativeType,
      }));

      const res = await fetch("/api/generate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: selectedProduct.name,
          productDescription: selectedProduct.description,
          brandName: selectedProduct.brand.name,
          productDna: {
            ...dna,
            price: selectedProduct.price,
            promotion: selectedProduct.promotion,
          },
          userConstraints: userConstraints || undefined,
          items,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Помилка генерації");
      }

      const data = await res.json();
      const resultItems = (data.items || []) as {
        backgroundId?: string;
        type?: string;
        headline: string;
        body: string;
        cta: string;
        needsReview?: boolean;
        reviewReason?: string;
      }[];

      // Match by index (most reliable) — Claude returns items in same order
      setSlots((prev) =>
        prev.map((slot, i) => {
          const item = resultItems[i];
          if (!item) return slot;
          return {
            ...slot,
            headline: item.headline || "",
            body: item.body || "",
            cta: item.cta || "",
            needsReview: item.needsReview,
            reviewReason: item.reviewReason,
            confirmed: false,
            hasText: true,
          };
        }),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Помилка генерації текстів");
    } finally {
      setTextsLoading(false);
    }
  }

  async function handleRegenerateSingle(slotIndex: number) {
    if (!selectedProduct) return;
    const slot = slots[slotIndex];
    if (!slot) return;

    // Show loading state on this slot
    setSlots((prev) =>
      prev.map((s, i) =>
        i === slotIndex ? { ...s, hasText: false, headline: "", body: "", cta: "" } : s,
      ),
    );

    try {
      const dna = selectedProduct.productDna as Record<string, unknown> | null;

      const res = await fetch("/api/generate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: selectedProduct.name,
          productDescription: selectedProduct.description,
          brandName: selectedProduct.brand.name,
          productDna: {
            ...dna,
            price: selectedProduct.price,
            promotion: selectedProduct.promotion,
          },
          userConstraints: userConstraints || undefined,
          items: [{ backgroundId: "0", creativeType: slot.creativeType }],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Помилка");
      }

      const data = await res.json();
      const item = ((data.items || []) as Record<string, unknown>[])[0];
      if (item) {
        setSlots((prev) =>
          prev.map((s, i) =>
            i === slotIndex
              ? {
                  ...s,
                  headline: (item.headline as string) || "",
                  body: (item.body as string) || "",
                  cta: (item.cta as string) || "",
                  needsReview: item.needsReview as boolean | undefined,
                  reviewReason: item.reviewReason as string | undefined,
                  confirmed: false,
                  hasText: true,
                }
              : s,
          ),
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Помилка перегенерації");
      // Restore the slot
      setSlots((prev) =>
        prev.map((s, i) =>
          i === slotIndex ? { ...s, hasText: slot.hasText, headline: slot.headline, body: slot.body, cta: slot.cta } : s,
        ),
      );
    }
  }

  function updateSlotField(idx: number, field: "headline" | "body" | "cta", value: string) {
    setSlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  }

  function updateSlotType(idx: number, type: CreativeType) {
    setSlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, creativeType: type } : s)),
    );
  }

  function toggleConfirm(idx: number) {
    setSlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, confirmed: !s.confirmed } : s)),
    );
  }

  const allTextsConfirmed =
    slots.length > 0 && slots.every((s) => s.confirmed && s.hasText);

  const imagesAllDone =
    selectedTemplates.length > 0 &&
    selectedTemplates.every((_, i) => {
      const img = generatedImages.get(i);
      return img && !img.loading;
    });

  // For restored sessions where generatedImages is empty but slots exist
  const hasSlots = slots.length > 0;

  /* ---------------------------------------------------------------- */
  /*  Step 1 — Images + inline texts                                   */
  /* ---------------------------------------------------------------- */
  if (step === 1) {
    const isGeneratingImages = !imagesAllDone && !hasSlots;

    return (
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep(0)} disabled={isGeneratingImages}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Назад
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Креативи</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedProduct?.brand.name} — {selectedProduct?.name}
            {isGeneratingImages && (
              <span className="ml-2">— генерація зображень...</span>
            )}
          </p>
        </div>

        {/* Image generation in progress */}
        {isGeneratingImages && (
          <div className="space-y-4">
            {selectedTemplates.map((template, i) => {
              const img = generatedImages.get(i);
              const isLoading = img?.loading ?? true;
              const hasError = !!img?.error;

              if (isLoading) {
                return (
                  <Card key={template.id}>
                    <CardContent className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="ml-3 text-sm text-muted-foreground">
                        {template.label || "Шаблон"} — генерація {imageCount} варіантів...
                      </p>
                    </CardContent>
                  </Card>
                );
              }
              if (hasError) {
                return (
                  <Card key={template.id}>
                    <CardContent className="flex flex-col items-center gap-3 py-10">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                      <p className="text-center text-sm text-destructive">{img?.error}</p>
                      <Button variant="outline" size="sm" onClick={() => generateImagesForTemplate(i)}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Повторити
                      </Button>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Slots ready */}
        {hasSlots && (
          <>
            {/* Constraints + generate texts */}
            <Card className="mb-6">
              <CardContent className="space-y-3 pt-5">
                <div className="space-y-1.5">
                  <Label htmlFor="constraints" className="text-sm font-semibold">
                    Обмеження та інструкції
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      необов&apos;язково, найвищий пріоритет для всіх текстів
                    </span>
                  </Label>
                  <Textarea
                    id="constraints"
                    value={userConstraints}
                    onChange={(e) => setUserConstraints(e.target.value)}
                    placeholder="Заборонені слова, вимоги комплаєнсу, побажання — напр.: не вживати 'лікує', 'гарантує'; згадати знижку"
                    rows={2}
                  />
                </div>
                <Button onClick={handleGenerateTexts} disabled={textsLoading}>
                  {textsLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Type className="mr-2 h-4 w-4" />
                  )}
                  {slots.some((s) => s.hasText) ? "Перегенерувати всі тексти" : "Згенерувати тексти"}
                </Button>
              </CardContent>
            </Card>

            {textsLoading && (
              <Card className="mb-6">
                <CardContent className="py-8">
                  <AnalysisLoader />
                </CardContent>
              </Card>
            )}

            {/* Slot cards */}
            <div className="space-y-6">
              {slots.map((slot, i) => (
                <Card
                  key={i}
                  className={cn(
                    "overflow-hidden transition-all",
                    slot.confirmed && "border-green-500/50",
                    slot.needsReview && !slot.confirmed && "border-yellow-500/50",
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex gap-4">
                      {/* Image preview */}
                      <div className="relative h-48 w-32 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={slot.variant.imageUrl}
                          alt={`Фон ${i + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      {/* Right side */}
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-muted-foreground">{slot.templateLabel}</p>
                          <Badge variant="outline" className="text-[10px]">
                            text: {slot.variant.textZone}
                          </Badge>
                          {slot.confirmed && <Check className="ml-auto h-4 w-4 text-green-600" />}
                        </div>

                        {/* Type selector */}
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Тип креативу</Label>
                          <Select
                            value={slot.creativeType}
                            onValueChange={(v) => v && updateSlotType(i, v as CreativeType)}
                          >
                            <SelectTrigger className="h-8 w-full text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CREATIVE_TYPES.map((ct) => (
                                <SelectItem key={ct.value} value={ct.value}>
                                  {ct.label} — {ct.tag}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {slot.needsReview && (
                          <p className="text-xs text-yellow-600">{slot.reviewReason}</p>
                        )}

                        {/* Text fields */}
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Headline</Label>
                            <Input
                              value={slot.headline}
                              onChange={(e) => updateSlotField(i, "headline", e.target.value)}
                              placeholder={slot.hasText ? "" : "Згенерується автоматично"}
                              className="h-8 text-sm font-semibold"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Body</Label>
                            <Textarea
                              value={slot.body}
                              onChange={(e) => updateSlotField(i, "body", e.target.value)}
                              placeholder={slot.hasText ? "" : "Згенерується автоматично"}
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">CTA</Label>
                            <Input
                              value={slot.cta}
                              onChange={(e) => updateSlotField(i, "cta", e.target.value)}
                              placeholder={slot.hasText ? "" : "Згенерується автоматично"}
                              className="h-8 text-sm font-medium text-primary"
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2">
                          {slot.hasText && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleRegenerateSingle(i)}
                            >
                              <RefreshCw className="mr-1 h-3 w-3" />
                              Перегенерувати
                            </Button>
                          )}
                          <Button
                            variant={slot.confirmed ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => toggleConfirm(i)}
                            disabled={!slot.hasText && !slot.headline}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            {slot.confirmed ? "Підтверджено" : "Підтвердити"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Next step */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {slots.length} фонів · {slots.filter((s) => s.confirmed).length}/{slots.length} підтверджено
              </p>
              <Button size="lg" disabled={!allTextsConfirmed}>
                Далі — фінальні креативи
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Step 0 — Product + Templates + Settings                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Створити креатив</h1>
        <p className="mt-1 text-muted-foreground">
          Оберіть товар, шаблони, модель та кількість варіантів
        </p>
      </div>

      {/* Restore session banner */}
      {savedSession && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <History className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Є незавершена сесія</p>
              <p className="text-xs text-muted-foreground">
                {savedSession.slots.length} фонів · {savedSession.slots.filter((s) => s.confirmed).length} підтверджено
                · {new Date(savedSession.savedAt).toLocaleString("uk-UA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
              </p>
            </div>
            <Button size="sm" onClick={() => restoreSession(savedSession)}>
              <History className="mr-1.5 h-3.5 w-3.5" />
              Продовжити
            </Button>
            <Button variant="ghost" size="sm" onClick={discardSession}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Product */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Товар</Label>
          {products.length === 0 ? (
            <Card>
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Немає готових товарів. Спочатку створіть товар та заповніть Product DNA.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Select value={productId} onValueChange={(v) => v && setProductId(v)}>
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
                        <span className="text-xs text-muted-foreground">({p.price})</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Templates */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Шаблони
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              до 4 шаблонів · обрано {selectedTemplateIds.size}
            </span>
          </Label>

          {templatesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="flex items-center gap-3 py-6">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Шаблонів ще немає. Попросіть адміністратора додати їх.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {templates.map((t) => {
                const isSelected = selectedTemplateIds.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTemplate(t.id)}
                    className={cn(
                      "group relative overflow-hidden rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-primary shadow-md"
                        : "border-transparent hover:border-primary/40",
                    )}
                  >
                    <div className="relative aspect-[3/4]">
                      <Image
                        src={t.imageUrl}
                        alt={t.label || "Шаблон"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-5 w-5" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-card px-2 py-1.5">
                      <p className="truncate text-xs font-medium">{t.label || "Шаблон"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Model + count selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold">Модель</Label>
            <div className="flex gap-3">
              {(["gpt-image-1", "gpt-image-2"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setImageModel(m)}
                  className={cn(
                    "rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all",
                    imageModel === m
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m === "gpt-image-1" ? "GPT Image 1" : "GPT Image 2"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">Варіантів на шаблон</Label>
            <div className="flex gap-3">
              {([2, 4] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setImageCount(c)}
                  className={cn(
                    "rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all",
                    imageCount === c
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {c} варіанти
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="lg" disabled={!canProceed} onClick={handleGenerate}>
            Згенерувати
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
