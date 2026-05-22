"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Loader2, X, ImageIcon, Globe, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AnalysisLoader } from "@/components/analysis-loader";

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  promotion: string;
  // DNA fields
  tone: string;
  targetSegments: string;
  painPoints: string;
  benefits: string;
  mainObjection: string;
}

interface ProductFormProps {
  brandId: string;
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    price: string | null;
    promotion: string | null;
    imageUrls: string[];
    productDna?: {
      tone: string;
      targetSegments: string;
      painPoints: string;
      benefits: string;
      mainObjection: string;
    } | null;
  };
}

export function ProductForm({ brandId, initialData }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialData?.imageUrls ?? []
  );
  const [uploading, setUploading] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);

  const isEditing = !!initialData;
  const dna = initialData?.productDna;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      price: initialData?.price ?? "",
      promotion: initialData?.promotion ?? "",
      tone: dna?.tone ?? "",
      targetSegments: dna?.targetSegments ?? "",
      painPoints: dna?.painPoints ?? "",
      benefits: dna?.benefits ?? "",
      mainObjection: dna?.mainObjection ?? "",
    },
  });

  async function handleScrapeUrl() {
    if (!scrapeUrl) return;
    setScraping(true);
    setError(null);

    try {
      const res = await fetch("/api/products/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl, brandId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Помилка зчитування");
      }

      const data = await res.json();

      // Fill form fields with scraped data
      if (data.name) setValue("name", data.name);
      if (data.description) setValue("description", data.description);
      if (data.price) setValue("price", data.price);
      if (data.tone) setValue("tone", data.tone);
      if (data.targetSegments) setValue("targetSegments", data.targetSegments);
      if (data.painPoints) setValue("painPoints", data.painPoints);
      if (data.benefits) setValue("benefits", data.benefits);
      if (data.mainObjection) setValue("mainObjection", data.mainObjection);
      if (data.imageUrls?.length) {
        setImageUrls((prev) => [...prev, ...data.imageUrls].slice(0, 10));
      }

      toast.success("Дані зчитано! Перевірте та збережіть.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Помилка зчитування";
      setError(msg);
      toast.error(msg);
    } finally {
      setScraping(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 10 - imageUrls.length;
    if (remaining <= 0) {
      setError("Максимум 10 фото");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const newUrls: string[] = [];

      for (const file of filesToUpload) {
        const ext = file.name.split(".").pop();
        const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { data, error: uploadError } = await supabase.storage
          .from("brands")
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("brands").getPublicUrl(data.path);

        newUrls.push(publicUrl);
      }

      setImageUrls((prev) => [...prev, ...newUrls]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Помилка завантаження фото";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(formData: ProductFormData) {
    setLoading(true);
    setError(null);

    const hasDna = formData.tone || formData.targetSegments || formData.painPoints || formData.benefits || formData.mainObjection;

    const productDna = hasDna
      ? {
          tone: formData.tone,
          targetSegments: formData.targetSegments,
          painPoints: formData.painPoints,
          benefits: formData.benefits,
          mainObjection: formData.mainObjection,
        }
      : null;

    try {
      const url = isEditing
        ? `/api/products/${initialData.id}`
        : "/api/products";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          name: formData.name,
          description: formData.description || null,
          price: formData.price || null,
          promotion: formData.promotion || null,
          imageUrls,
          productDna,
          ...(productDna && { status: "READY" }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Помилка збереження");
      }

      const product = await res.json();
      toast.success(isEditing ? "Товар оновлено!" : "Товар створено!");
      router.push(`/products/${product.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Помилка збереження товару";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* URL scrape */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Зчитати за посиланням
            </CardTitle>
            <CardDescription>
              Вставте URL сторінки товару — ШІ заповнить всі поля автоматично. Ви зможете відредагувати перед збереженням.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scraping ? (
              <AnalysisLoader />
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    placeholder="https://example.com/product/..."
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleScrapeUrl}
                  disabled={!scrapeUrl}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Зчитати
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product info */}
      <Card>
        <CardHeader>
          <CardTitle>Інформація про товар</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Назва товару *</Label>
            <Input
              id="name"
              {...register("name", { required: "Назва обов'язкова" })}
              placeholder="Введіть назву товару"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Опис товару</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Детальний опис товару: характеристики, особливості, матеріали..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Ціна</Label>
              <Input
                id="price"
                {...register("price")}
                placeholder="1 299 ₴"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotion">Акція</Label>
              <Input
                id="promotion"
                {...register("promotion")}
                placeholder="Знижка 20% до кінця місяця"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product images */}
      <Card>
        <CardHeader>
          <CardTitle>Фото товару</CardTitle>
          <CardDescription>
            Завантажте до 10 фото товару (PNG/JPG). Ці фото використовуватимуться як reference для генерації креативів.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {imageUrls.map((url, index) => (
              <div key={index} className="group relative aspect-square">
                <Image
                  src={url}
                  alt={`Фото ${index + 1}`}
                  fill
                  className="rounded-lg object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {imageUrls.length < 10 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <span className="mt-1 text-xs text-muted-foreground">
                      {imageUrls.length}/10
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product DNA */}
      <Card>
        <CardHeader>
          <CardTitle>Product DNA</CardTitle>
          <CardDescription>
            Маркетингова суть товару для генерації креативів. Заповніть вручну або залиште порожнім — можна додати пізніше.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tone">Тон комунікації</Label>
            <Input
              id="tone"
              {...register("tone")}
              placeholder="Наприклад: дружній, експертний, провокативний, преміальний"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetSegments">Цільові сегменти (1-2)</Label>
            <Textarea
              id="targetSegments"
              {...register("targetSegments")}
              placeholder="Наприклад: молоді мами 25-35, які шукають натуральні засоби догляду"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="painPoints">Болі ЦА</Label>
            <Textarea
              id="painPoints"
              {...register("painPoints")}
              placeholder="Ключові болі та потреби цільової аудиторії"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">Переваги-факти</Label>
            <Textarea
              id="benefits"
              {...register("benefits")}
              placeholder="Стислі, конкретні переваги товару (факти, не маркетингові кліше)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mainObjection">Головне заперечення</Label>
            <Textarea
              id="mainObjection"
              {...register("mainObjection")}
              placeholder="Одне головне заперечення ЦА та як його знімає товар"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Скасувати
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Збереження...
            </>
          ) : isEditing ? (
            "Зберегти зміни"
          ) : (
            "Створити товар"
          )}
        </Button>
      </div>
    </form>
  );
}
