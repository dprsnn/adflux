"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Loader2,
  Upload,
  Trash2,
  ImageIcon,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */

const CREATIVE_TYPES = [
  { value: "CONVERSION", label: "Конверсійний", tag: "Проблема → Рішення → CTA" },
  { value: "SOCIAL_PROOF", label: "Соціальний доказ", tag: "Цитата → Деталь → Довіра" },
  { value: "PROMO", label: "Промо", tag: "Оффер + дедлайн + вигода" },
  { value: "UGC", label: "UGC / Нативний", tag: "Нативний стиль" },
] as const;

type CreativeTypeValue = (typeof CREATIVE_TYPES)[number]["value"];

interface Reference {
  id: string;
  imageUrl: string;
  creativeType: CreativeTypeValue;
  label: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */

export function AdminReferencesClient() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");

  // Upload form state
  const [uploading, setUploading] = useState(false);
  const [newType, setNewType] = useState<CreativeTypeValue>("CONVERSION");
  const [newLabel, setNewLabel] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRefs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "ALL") params.set("type", filterType);
      const res = await fetch(`/api/admin/references?${params}`);
      if (!res.ok) throw new Error();
      setReferences(await res.json());
    } catch {
      toast.error("Не вдалося завантажити референси");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchRefs();
  }, [fetchRefs]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearFile() {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);

    try {
      // 1. Upload to Supabase Storage
      const supabase = createClient();
      const ext = selectedFile.name.split(".").pop();
      const fileName = `references/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
        .from("brands")
        .upload(fileName, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("brands").getPublicUrl(data.path);

      // 2. Save to DB
      const res = await fetch("/api/admin/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: publicUrl,
          creativeType: newType,
          label: newLabel || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Помилка збереження");
      }

      toast.success("Референс додано!");
      clearFile();
      setNewLabel("");
      fetchRefs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/references", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setReferences((prev) => prev.filter((r) => r.id !== id));
      toast.success("Референс видалено");
    } catch {
      toast.error("Помилка видалення");
    } finally {
      setDeletingId(null);
    }
  }

  const typeLabel = (t: CreativeTypeValue) =>
    CREATIVE_TYPES.find((ct) => ct.value === t);

  const filtered = references;

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Референси креативів
        </h1>
        <p className="mt-1 text-muted-foreground">
          Завантажуйте приклади креативів для кожного типу макету
        </p>
      </div>

      {/* Upload form */}
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Preview / file picker */}
            <div className="shrink-0">
              {previewUrl ? (
                <div className="group relative h-32 w-32">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="rounded-lg object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <span className="mt-1 text-xs text-muted-foreground">
                    Обрати фото
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <Label>Тип креативу</Label>
                <Select
                  value={newType}
                  onValueChange={(v) => setNewType(v as CreativeTypeValue)}
                >
                  <SelectTrigger>
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
              <div className="space-y-1.5">
                <Label>
                  Підпис{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    необов&apos;язково
                  </span>
                </Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Короткий опис референсу"
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Завантажити
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="mb-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Усі типи</SelectItem>
            {CREATIVE_TYPES.map((ct) => (
              <SelectItem key={ct.value} value={ct.value}>
                {ct.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {filterType !== "ALL"
                ? "Немає референсів для цього типу"
                : "Референсів ще немає. Завантажте перший!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ref) => {
            const ct = typeLabel(ref.creativeType);
            return (
              <Card key={ref.id} className="group overflow-hidden">
                <div className="relative aspect-[4/5]">
                  <Image
                    src={ref.imageUrl}
                    alt={ref.label || "Референс"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(ref.id)}
                    disabled={deletingId === ref.id}
                    className="absolute right-2 top-2 rounded-lg bg-background/80 p-1.5 text-destructive opacity-0 backdrop-blur-sm transition-opacity hover:bg-background group-hover:opacity-100"
                  >
                    {deletingId === ref.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <CardContent className="py-3">
                  <p className="text-xs font-medium text-primary">
                    {ct?.label}
                  </p>
                  {ref.label && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {ref.label}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
