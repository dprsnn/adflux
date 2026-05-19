"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface BrandFormData {
  name: string;
  url: string;
}

interface BrandFormProps {
  initialData?: {
    id: string;
    name: string;
    url: string | null;
    logoUrl: string | null;
  };
}

export function BrandForm({ initialData }: BrandFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(
    initialData?.logoUrl ?? null
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BrandFormData>({
    defaultValues: {
      name: initialData?.name ?? "",
      url: initialData?.url ?? "",
    },
  });

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
        .from("brands")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("brands").getPublicUrl(data.path);

      setLogoUrl(publicUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Помилка завантаження логотипу";
      setError(msg);
      toast.error(msg);
    } finally {
      setLogoUploading(false);
    }
  }

  async function onSubmit(formData: BrandFormData) {
    setLoading(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/brands/${initialData.id}`
        : "/api/brands";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url || null,
          logoUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Помилка збереження");
      }

      const brand = await res.json();
      toast.success(isEditing ? "Бренд оновлено!" : "Бренд створено!");
      router.push(`/brands/${brand.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Помилка збереження бренду";
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

      <Card>
        <CardHeader>
          <CardTitle>Основна інформація</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Назва бренду *</Label>
            <Input
              id="name"
              {...register("name", { required: "Назва обов'язкова" })}
              placeholder="Введіть назву бренду"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Сайт бренду</Label>
            <Input
              id="url"
              {...register("url")}
              placeholder="https://example.com"
            />
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <Label>Логотип</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative">
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-lg object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50">
                  {logoUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                  />
                </label>
              )}
              <p className="text-xs text-muted-foreground">
                PNG, SVG або JPG. Рекомендовано 512×512px.
              </p>
            </div>
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
            "Створити бренд"
          )}
        </Button>
      </div>
    </form>
  );
}
