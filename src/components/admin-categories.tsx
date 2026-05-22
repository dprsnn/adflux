"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { references: number };
}

export function AdminCategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ name: "", slug: "", description: "" });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error();
      setCategories(await res.json());
    } catch {
      toast.error("Не вдалося завантажити категорії");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9а-яіїєґ\s-]/g, "")
      .replace(/[а-яіїєґ]+/g, (match) => {
        const map: Record<string, string> = {
          а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye",
          ж: "zh", з: "z", и: "y", і: "i", ї: "yi", й: "y", к: "k", л: "l",
          м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
          ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
          ю: "yu", я: "ya",
        };
        return match.split("").map((c) => map[c] || c).join("");
      })
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleNameChange(name: string) {
    setNewName(name);
    setNewSlug(autoSlug(name));
  }

  async function handleCreate() {
    if (!newName || !newSlug) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          slug: newSlug,
          description: newDescription || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Помилка");
      }
      toast.success("Категорію створено!");
      setNewName("");
      setNewSlug("");
      setNewDescription("");
      fetchCategories();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Помилка створення");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditFields({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
    });
  }

  async function handleSave(id: string) {
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editFields }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Помилка");
      }
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, name: editFields.name, slug: editFields.slug, description: editFields.description || null }
            : c
        )
      );
      setEditingId(null);
      toast.success("Збережено");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Помилка");
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Видалено");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Помилка видалення");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Категорії референсів</h1>
        <p className="mt-1 text-muted-foreground">
          Категорії групують шаблони за типом креативу
        </p>
      </div>

      {/* Create form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Нова категорія
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Назва</Label>
              <Input
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Конверсійний"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="conversion"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Опис</Label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Проблема → Рішення → CTA"
            />
          </div>
          <Button onClick={handleCreate} disabled={!newName || !newSlug || creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Створити
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Категорій ще немає</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;

            return (
              <Card key={cat.id}>
                <CardContent className="py-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Назва</Label>
                          <Input
                            value={editFields.name}
                            onChange={(e) => setEditFields((p) => ({ ...p, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Slug</Label>
                          <Input
                            value={editFields.slug}
                            onChange={(e) => setEditFields((p) => ({ ...p, slug: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Опис</Label>
                        <Input
                          value={editFields.description}
                          onChange={(e) => setEditFields((p) => ({ ...p, description: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(cat.id)} disabled={savingId === cat.id}>
                          {savingId === cat.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                          Зберегти
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          <X className="mr-1.5 h-3.5 w-3.5" />
                          Скасувати
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{cat.name}</p>
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                            {cat.slug}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {cat._count.references} реф.
                          </span>
                        </div>
                        {cat.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(cat)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === cat.id}
                          onClick={() => handleDelete(cat.id)}
                        >
                          {deletingId === cat.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
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
