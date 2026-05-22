"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { Loader2, Save, X } from "lucide-react";

export interface ProductDna {
  tone: string;
  targetSegments: string;
  painPoints: string;
  benefits: string;
  mainObjection: string;
}

interface ProductDnaFormProps {
  productId: string;
  initialDna: ProductDna | null;
  onCancel?: () => void;
}

interface FormData {
  tone: string;
  targetSegments: string;
  painPoints: string;
  benefits: string;
  mainObjection: string;
}

export function ProductDnaForm({ productId, initialDna, onCancel }: ProductDnaFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
  } = useForm<FormData>({
    defaultValues: {
      tone: initialDna?.tone ?? "",
      targetSegments: initialDna?.targetSegments ?? "",
      painPoints: initialDna?.painPoints ?? "",
      benefits: initialDna?.benefits ?? "",
      mainObjection: initialDna?.mainObjection ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);

    const productDna: ProductDna = {
      tone: data.tone,
      targetSegments: data.targetSegments,
      painPoints: data.painPoints,
      benefits: data.benefits,
      mainObjection: data.mainObjection,
    };

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productDna, status: "READY" }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Помилка збереження");
      }

      router.refresh();
      onCancel?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {initialDna ? "Редагувати Product DNA" : "Заповнити Product DNA вручну"}
          </CardTitle>
          <CardDescription>
            Маркетингова суть товару для генерації креативів
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

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Скасувати
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Збереження...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Зберегти Product DNA
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
