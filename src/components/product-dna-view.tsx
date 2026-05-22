"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, FileText } from "lucide-react";
import { ProductDnaForm } from "@/components/product-dna-form";
import type { ProductDna } from "@/components/product-dna-form";

interface ProductDnaViewProps {
  productId: string;
  initialDna: ProductDna | null;
}

export function ProductDnaView({ productId, initialDna }: ProductDnaViewProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="mt-4">
        <ProductDnaForm
          productId={productId}
          initialDna={initialDna}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  if (!initialDna) {
    return (
      <div className="mt-4">
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">
              Product DNA ще не заповнено
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Згенеруйте автоматично або заповніть вручну
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Заповнити вручну
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Редагувати вручну
        </Button>
      </div>

      <div className="space-y-4">
        <DnaSection title="Тон комунікації" content={initialDna.tone} />
        <DnaSection title="Цільові сегменти" content={initialDna.targetSegments} />
        <DnaSection title="Болі ЦА" content={initialDna.painPoints} />
        <DnaSection title="Переваги-факти" content={initialDna.benefits} />
        <DnaSection title="Головне заперечення" content={initialDna.mainObjection} />
      </div>
    </div>
  );
}

function toDisplayString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(toDisplayString).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${key}: ${typeof val === "string" ? val : JSON.stringify(val)}`)
      .join("\n");
  }
  return String(value);
}

function DnaSection({
  title,
  content,
}: {
  title: string;
  content?: unknown;
}) {
  const text = toDisplayString(content);
  if (!text) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm">{text}</p>
      </CardContent>
    </Card>
  );
}
