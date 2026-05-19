"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, FileText } from "lucide-react";
import { ProductDnaForm } from "@/components/product-dna-form";

interface ProductDna {
  painPoints: unknown;
  benefits: unknown;
  uniqueSellingPoints: unknown;
  slogans: unknown;
  callToActions: unknown;
  objections: unknown;
  targetSegments: unknown;
  emotionalTriggers: unknown;
  keywords: unknown;
}

interface ProductDnaViewProps {
  productId: string;
  initialDna: ProductDna | null;
}

export function ProductDnaView({ productId, initialDna }: ProductDnaViewProps) {
  const [editing, setEditing] = useState(false);

  // Editing mode — show form (cast to expected type for the form)
  if (editing) {
    return (
      <div className="mt-4">
        <ProductDnaForm
          productId={productId}
          initialDna={initialDna as Parameters<typeof ProductDnaForm>[0]["initialDna"]}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  // No DNA yet — show empty state with button
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

  // Safely normalize arrays — Claude may return a string instead of string[]
  const slogans = toStringArray(initialDna.slogans);
  const callToActions = toStringArray(initialDna.callToActions);
  const keywords = toStringArray(initialDna.keywords);

  // Read-only view
  return (
    <div className="mt-4">
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Редагувати вручну
        </Button>
      </div>

      <div className="space-y-4">
        <DnaSection title="Болі та потреби ЦА" content={initialDna.painPoints} />
        <DnaSection title="Переваги та характеристики" content={initialDna.benefits} />
        <DnaSection title="Унікальні торгові пропозиції" content={initialDna.uniqueSellingPoints} />
        <DnaSection title="Цільові сегменти" content={initialDna.targetSegments} />
        <DnaSection title="Емоційні тригери" content={initialDna.emotionalTriggers} />
        <DnaSection title="Заперечення та відповіді" content={initialDna.objections} />

        {slogans.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Рекламні слогани
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {slogans.map((s, i) => (
                  <li key={i} className="text-sm">
                    &laquo;{s}&raquo;
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {callToActions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Заклики до дії (CTA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {callToActions.map((cta, i) => (
                  <Badge key={i} variant="secondary">
                    {cta}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {keywords.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Ключові слова
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <Badge key={i} variant="outline">
                    {kw}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * Safely normalizes a value into a string array.
 * Claude may return a single string, an object, or an actual array.
 */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
  if (typeof value === "string") return value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  if (value != null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
    );
  }
  return [];
}

/**
 * Safely converts any value to a renderable string.
 * Claude may return objects instead of strings for some fields.
 */
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
