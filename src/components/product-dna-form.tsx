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
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, X } from "lucide-react";

interface ProductDna {
  painPoints: string;
  benefits: string;
  uniqueSellingPoints: string;
  slogans: string[];
  callToActions: string[];
  objections: string;
  targetSegments: string;
  emotionalTriggers: string;
  keywords: string[];
}

interface ProductDnaFormProps {
  productId: string;
  initialDna: ProductDna | null;
  onCancel?: () => void;
}

interface FormData {
  painPoints: string;
  benefits: string;
  uniqueSellingPoints: string;
  slogans: string;
  callToActions: string;
  objections: string;
  targetSegments: string;
  emotionalTriggers: string;
  keywords: string;
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
      painPoints: initialDna?.painPoints ?? "",
      benefits: initialDna?.benefits ?? "",
      uniqueSellingPoints: initialDna?.uniqueSellingPoints ?? "",
      slogans: initialDna?.slogans?.join("\n") ?? "",
      callToActions: initialDna?.callToActions?.join(", ") ?? "",
      objections: initialDna?.objections ?? "",
      targetSegments: initialDna?.targetSegments ?? "",
      emotionalTriggers: initialDna?.emotionalTriggers ?? "",
      keywords: initialDna?.keywords?.join(", ") ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);

    const productDna: ProductDna = {
      painPoints: data.painPoints,
      benefits: data.benefits,
      uniqueSellingPoints: data.uniqueSellingPoints,
      slogans: data.slogans.split("\n").map((s) => s.trim()).filter(Boolean),
      callToActions: data.callToActions.split(",").map((s) => s.trim()).filter(Boolean),
      objections: data.objections,
      targetSegments: data.targetSegments,
      emotionalTriggers: data.emotionalTriggers,
      keywords: data.keywords.split(",").map((s) => s.trim()).filter(Boolean),
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
            Заповніть маркетингову інформацію про товар
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="painPoints">Болі та потреби ЦА</Label>
            <Textarea
              id="painPoints"
              {...register("painPoints")}
              placeholder="Болі та потреби цільової аудиторії щодо цього товару"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">Переваги та характеристики</Label>
            <Textarea
              id="benefits"
              {...register("benefits")}
              placeholder="Переваги та ключові характеристики товару"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uniqueSellingPoints">Унікальні торгові пропозиції</Label>
            <Textarea
              id="uniqueSellingPoints"
              {...register("uniqueSellingPoints")}
              placeholder="Чим цей товар кращий за конкурентів"
              rows={2}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="slogans">Рекламні слогани (кожен з нового рядка)</Label>
            <Textarea
              id="slogans"
              {...register("slogans")}
              placeholder={"Слоган 1\nСлоган 2\nСлоган 3"}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="callToActions">Заклики до дії / CTA (через кому)</Label>
            <Input
              id="callToActions"
              {...register("callToActions")}
              placeholder="Купити зараз, Дізнатись більше, Замовити"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="objections">Заперечення та відповіді</Label>
            <Textarea
              id="objections"
              {...register("objections")}
              placeholder="Можливі заперечення клієнтів та відповіді на них"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetSegments">Цільові сегменти</Label>
            <Textarea
              id="targetSegments"
              {...register("targetSegments")}
              placeholder="Конкретні сегменти аудиторії для цього товару"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emotionalTriggers">Емоційні тригери</Label>
            <Textarea
              id="emotionalTriggers"
              {...register("emotionalTriggers")}
              placeholder="Емоційні тригери для реклами"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Ключові слова (через кому)</Label>
            <Input
              id="keywords"
              {...register("keywords")}
              placeholder="септик, бактерії, очистка, екологія"
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
