"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Prompt {
  id: string;
  key: string;
  name: string;
  content: string;
  description: string | null;
  updatedAt: string;
}

export function AdminPromptsClient() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedContent, setEditedContent] = useState<Record<string, string>>(
    {}
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/prompts");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrompts(data);
      const initial: Record<string, string> = {};
      data.forEach((p: Prompt) => {
        initial[p.id] = p.content;
      });
      setEditedContent(initial);
    } catch {
      toast.error("Не вдалося завантажити промпти");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  async function handleSave(id: string) {
    const content = editedContent[id];
    if (!content) return;

    setSavingId(id);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content }),
      });
      if (!res.ok) throw new Error();
      toast.success("Промпт збережено");
      // Update the saved state
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, content } : p))
      );
    } catch {
      toast.error("Помилка збереження");
    } finally {
      setSavingId(null);
    }
  }

  function handleReset(prompt: Prompt) {
    setEditedContent((prev) => ({ ...prev, [prompt.id]: prompt.content }));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Промпти ШІ</h1>
        <p className="mt-1 text-muted-foreground">
          Редагуйте промпти, які використовуються для генерації текстів та
          зображень
        </p>
      </div>

      <div className="space-y-6">
        {prompts.map((prompt) => {
          const isModified = editedContent[prompt.id] !== prompt.content;
          const isSaving = savingId === prompt.id;

          return (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{prompt.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {prompt.key}
                  </Badge>
                  {isModified && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] text-primary"
                    >
                      змінено
                    </Badge>
                  )}
                </div>
                {prompt.description && (
                  <CardDescription>{prompt.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={editedContent[prompt.id] ?? ""}
                  onChange={(e) =>
                    setEditedContent((prev) => ({
                      ...prev,
                      [prompt.id]: e.target.value,
                    }))
                  }
                  rows={16}
                  className="font-mono text-xs"
                />
                <div className="flex justify-end gap-2">
                  {isModified && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReset(prompt)}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Скасувати
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={!isModified || isSaving}
                    onClick={() => handleSave(prompt.id)}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Зберегти
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
