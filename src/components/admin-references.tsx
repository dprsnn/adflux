"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  Loader2,
  Upload,
  Trash2,
  ImageIcon,
  X,
  Save,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  VariationAxesEditor,
  type VariationAxis,
} from "@/components/variation-axes-editor";

/* ------------------------------------------------------------------ */
/*  Helpers: parse / serialize imagePrompt JSON                        */
/* ------------------------------------------------------------------ */

interface ParsedPrompt {
  basePrompt: string;
  variationAxes: VariationAxis[];
}

function parseImagePrompt(raw: string | null): ParsedPrompt {
  if (!raw) return { basePrompt: "", variationAxes: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.basePrompt) {
      return {
        basePrompt: parsed.basePrompt,
        variationAxes: Array.isArray(parsed.variationAxes) ? parsed.variationAxes : [],
      };
    }
  } catch {
    // plain string
  }
  return { basePrompt: raw, variationAxes: [] };
}

function serializeImagePrompt(basePrompt: string, variationAxes: VariationAxis[]): string {
  // Filter out empty axes
  const cleaned = variationAxes
    .filter((a) => a.name && a.promptKey && a.values.length > 0)
    .map((a) => ({
      ...a,
      values: a.values.filter((v) =>
        typeof v === "string" ? v.trim() !== "" : v.text.trim() !== "",
      ),
    }))
    .filter((a) => a.values.length > 0);

  if (cleaned.length === 0 && basePrompt) {
    // No axes → check if it looks like plain string (backward compat)
    return JSON.stringify({ basePrompt, variationAxes: [] });
  }

  return JSON.stringify({ basePrompt, variationAxes: cleaned });
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface Reference {
  id: string;
  imageUrl: string;
  categoryId: string;
  category: Category;
  label: string | null;
  imagePrompt: string | null;
  textHint: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminReferencesClient() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoryId, setFilterCategoryId] = useState("ALL");

  // Upload form
  const [uploading, setUploading] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newBasePrompt, setNewBasePrompt] = useState("");
  const [newAxes, setNewAxes] = useState<VariationAxis[]>([]);
  const [newTextHint, setNewTextHint] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editBasePrompt, setEditBasePrompt] = useState("");
  const [editAxes, setEditAxes] = useState<VariationAxis[]>([]);
  const [editTextHint, setEditTextHint] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error();
      const cats: Category[] = await res.json();
      setCategories(cats);
      if (cats.length > 0 && !newCategoryId) {
        setNewCategoryId(cats[0].id);
      }
    } catch {
      toast.error("Не вдалося завантажити категорії");
    }
  }, []);

  const fetchRefs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategoryId !== "ALL") params.set("categoryId", filterCategoryId);
      const res = await fetch(`/api/admin/references?${params}`);
      if (!res.ok) throw new Error();
      setReferences(await res.json());
    } catch {
      toast.error("Не вдалося завантажити шаблони");
    } finally {
      setLoading(false);
    }
  }, [filterCategoryId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
    if (!selectedFile || !newCategoryId) return;
    setUploading(true);
    try {
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

      const imagePrompt = newBasePrompt
        ? serializeImagePrompt(newBasePrompt, newAxes)
        : undefined;

      const res = await fetch("/api/admin/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: publicUrl,
          categoryId: newCategoryId,
          label: newLabel || undefined,
          imagePrompt,
          textHint: newTextHint || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Помилка");

      toast.success("Шаблон додано!");
      clearFile();
      setNewLabel("");
      setNewBasePrompt("");
      setNewAxes([]);
      setNewTextHint("");
      fetchRefs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setUploading(false);
    }
  }

  function startEdit(ref: Reference) {
    const parsed = parseImagePrompt(ref.imagePrompt);
    setEditingId(ref.id);
    setEditLabel(ref.label || "");
    setEditCategoryId(ref.categoryId);
    setEditBasePrompt(parsed.basePrompt);
    setEditAxes(parsed.variationAxes);
    setEditTextHint(ref.textHint || "");
    setEditImageUrl(ref.imageUrl);
    setEditImagePreview(null);
  }

  async function handleEditImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `references/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from("brands")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("brands").getPublicUrl(data.path);
      setEditImageUrl(publicUrl);
      setEditImagePreview(publicUrl);
      toast.success("Фото завантажено");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Помилка завантаження фото");
    } finally {
      setEditImageUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave(id: string) {
    setSavingId(id);
    try {
      const imagePrompt = editBasePrompt
        ? serializeImagePrompt(editBasePrompt, editAxes)
        : "";

      const res = await fetch("/api/admin/references", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          imageUrl: editImageUrl,
          label: editLabel,
          categoryId: editCategoryId,
          imagePrompt,
          textHint: editTextHint,
        }),
      });
      if (!res.ok) throw new Error();
      fetchRefs();
      setEditingId(null);
      toast.success("Збережено");
    } catch {
      toast.error("Помилка збереження");
    } finally {
      setSavingId(null);
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
      toast.success("Видалено");
    } catch {
      toast.error("Помилка видалення");
    } finally {
      setDeletingId(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Prompt editor (shared between create & edit forms)               */
  /* ---------------------------------------------------------------- */

  function PromptEditor({
    basePrompt,
    onBasePromptChange,
    axes,
    onAxesChange,
    textHint,
    onTextHintChange,
  }: {
    basePrompt: string;
    onBasePromptChange: (v: string) => void;
    axes: VariationAxis[];
    onAxesChange: (v: VariationAxis[]) => void;
    textHint: string;
    onTextHintChange: (v: string) => void;
  }) {
    return (
      <>
        <div className="space-y-1.5">
          <Label className="text-xs">Базовий промпт (інваріант)</Label>
          <Textarea
            value={basePrompt}
            onChange={(e) => onBasePromptChange(e.target.value)}
            placeholder="Стиль, розташування товару, фотореалізм... Плейсхолдери: {{productName}}, {{brandName}}, {{productDescription}}"
            rows={4}
            className="font-mono text-xs"
          />
        </div>

        <VariationAxesEditor axes={axes} onChange={onAxesChange} />

        <div className="space-y-1.5">
          <Label className="text-xs">Підказка для тексту</Label>
          <Textarea
            value={textHint}
            onChange={(e) => onTextHintChange(e.target.value)}
            placeholder="Опис структури тексту: де заголовок, який стиль body, формат CTA..."
            rows={2}
            className="font-mono text-xs"
          />
        </div>
      </>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Шаблони креативів</h1>
        <p className="mt-1 text-muted-foreground">
          Кожен шаблон — базовий промпт + осі варіативності (колір, кут, розташування)
        </p>
      </div>

      {/* Upload */}
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="shrink-0">
              {previewUrl ? (
                <div className="group relative h-32 w-32">
                  <Image src={previewUrl} alt="Preview" fill className="rounded-lg object-cover" unoptimized />
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
                  <span className="mt-1 text-xs text-muted-foreground">Обрати фото</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
                </label>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Категорія</Label>
                  {categories.length === 0 ? (
                    <p className="text-sm text-destructive">Спочатку створіть категорію</p>
                  ) : (
                    <Select value={newCategoryId} onValueChange={(v) => v && setNewCategoryId(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Назва</Label>
                  <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Напр. Мінімалістичний промо" />
                </div>
              </div>

              <PromptEditor
                basePrompt={newBasePrompt}
                onBasePromptChange={setNewBasePrompt}
                axes={newAxes}
                onAxesChange={setNewAxes}
                textHint={newTextHint}
                onTextHintChange={setNewTextHint}
              />

              <Button onClick={handleUpload} disabled={!selectedFile || !newCategoryId || uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Додати шаблон
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="mb-4">
        <Select value={filterCategoryId} onValueChange={(v) => v && setFilterCategoryId(v)}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Усі категорії</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : references.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Шаблонів ще немає</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {references.map((ref) => {
            const isEditing = editingId === ref.id;
            const parsed = parseImagePrompt(ref.imagePrompt);

            return (
              <Card key={ref.id}>
                <CardContent className="py-4">
                  <div className="flex gap-4">
                    {/* Preview */}
                    <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={isEditing && editImagePreview ? editImagePreview : ref.imageUrl}
                        alt={ref.label || "Шаблон"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {isEditing && (
                        <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                          {editImageUploading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-white" />
                          )}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleEditImageUpload}
                            disabled={editImageUploading}
                          />
                        </label>
                      )}
                    </div>

                    {/* Info / Edit */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{ref.label || "Без назви"}</p>
                          <p className="text-xs text-primary">{ref.category?.name}</p>
                        </div>
                        <div className="flex gap-1.5">
                          {!isEditing && (
                            <Button variant="ghost" size="sm" onClick={() => startEdit(ref)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" disabled={deletingId === ref.id} onClick={() => handleDelete(ref.id)}>
                            {deletingId === ref.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Назва</Label>
                              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Категорія</Label>
                              <Select value={editCategoryId} onValueChange={(v) => v && setEditCategoryId(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <PromptEditor
                            basePrompt={editBasePrompt}
                            onBasePromptChange={setEditBasePrompt}
                            axes={editAxes}
                            onAxesChange={setEditAxes}
                            textHint={editTextHint}
                            onTextHintChange={setEditTextHint}
                          />

                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSave(ref.id)} disabled={savingId === ref.id}>
                              {savingId === ref.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Зберегти
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                              Скасувати
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {parsed.basePrompt ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              <span className="font-medium">Промпт:</span> {parsed.basePrompt.slice(0, 120)}
                              {parsed.basePrompt.length > 120 && "..."}
                            </p>
                          ) : (
                            <p className="text-xs text-destructive">Промпт не заповнено</p>
                          )}
                          {parsed.variationAxes.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Осі:</span>{" "}
                              {parsed.variationAxes
                                .map((a) => `${a.name} (${a.values.length})`)
                                .join(", ")}
                            </p>
                          )}
                          {ref.textHint && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              <span className="font-medium">Текст:</span> {ref.textHint.slice(0, 80)}
                              {ref.textHint.length > 80 && "..."}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
