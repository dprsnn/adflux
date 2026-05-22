"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, X, GripVertical } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types (match the API contract)                                     */
/* ------------------------------------------------------------------ */

export type AxisValue = string | { text: string; freeSide: string };

export interface VariationAxis {
  name: string;
  promptKey: string;
  values: AxisValue[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface VariationAxesEditorProps {
  axes: VariationAxis[];
  onChange: (axes: VariationAxis[]) => void;
}

export function VariationAxesEditor({ axes, onChange }: VariationAxesEditorProps) {
  function addAxis() {
    onChange([...axes, { name: "", promptKey: "", values: [""] }]);
  }

  function removeAxis(idx: number) {
    onChange(axes.filter((_, i) => i !== idx));
  }

  function updateAxis(idx: number, field: "name" | "promptKey", value: string) {
    onChange(axes.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  }

  function addValue(axisIdx: number, withFreeSide: boolean) {
    onChange(
      axes.map((a, i) =>
        i === axisIdx
          ? {
              ...a,
              values: [
                ...a.values,
                withFreeSide ? { text: "", freeSide: "left" } : "",
              ],
            }
          : a,
      ),
    );
  }

  function removeValue(axisIdx: number, valIdx: number) {
    onChange(
      axes.map((a, i) =>
        i === axisIdx
          ? { ...a, values: a.values.filter((_, vi) => vi !== valIdx) }
          : a,
      ),
    );
  }

  function updateStringValue(axisIdx: number, valIdx: number, text: string) {
    onChange(
      axes.map((a, i) =>
        i === axisIdx
          ? {
              ...a,
              values: a.values.map((v, vi) => {
                if (vi !== valIdx) return v;
                return typeof v === "object" ? { ...v, text } : text;
              }),
            }
          : a,
      ),
    );
  }

  function updateFreeSide(axisIdx: number, valIdx: number, freeSide: string) {
    onChange(
      axes.map((a, i) =>
        i === axisIdx
          ? {
              ...a,
              values: a.values.map((v, vi) => {
                if (vi !== valIdx) return v;
                const text = typeof v === "object" ? v.text : v;
                return { text, freeSide };
              }),
            }
          : a,
      ),
    );
  }

  /** Does this axis have any value with freeSide? */
  function axisHasFreeSide(axis: VariationAxis): boolean {
    return axis.values.some((v) => typeof v === "object" && v.freeSide);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Осі варіативності
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addAxis}>
          <Plus className="mr-1 h-3 w-3" />
          Додати вісь
        </Button>
      </div>

      {axes.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Немає осей — використовуватимуться дефолтні (колір, кут, розташування)
        </p>
      )}

      {axes.map((axis, ai) => {
        const hasFreeSide = axisHasFreeSide(axis);

        return (
          <Card key={ai} className="border-dashed">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2 pt-3">
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="grid flex-1 grid-cols-2 gap-2">
                <Input
                  value={axis.name}
                  onChange={(e) => updateAxis(ai, "name", e.target.value)}
                  placeholder="Назва (напр. Колір)"
                  className="h-8 text-xs"
                />
                <Input
                  value={axis.promptKey}
                  onChange={(e) => updateAxis(ai, "promptKey", e.target.value)}
                  placeholder="Ключ промпту (напр. COLOR THEME)"
                  className="h-8 font-mono text-xs"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0"
                onClick={() => removeAxis(ai)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-1.5 pb-3">
              {axis.values.map((val, vi) => {
                const isObj = typeof val === "object";
                const text = isObj ? val.text : val;
                const freeSide = isObj ? val.freeSide : "";

                return (
                  <div key={vi} className="flex items-center gap-1.5">
                    <Input
                      value={text}
                      onChange={(e) => updateStringValue(ai, vi, e.target.value)}
                      placeholder="Значення..."
                      className="h-7 flex-1 text-xs"
                    />
                    {(isObj || hasFreeSide) && (
                      <select
                        value={freeSide}
                        onChange={(e) => updateFreeSide(ai, vi, e.target.value)}
                        className="h-7 rounded border border-border bg-background px-1.5 text-xs"
                      >
                        <option value="">—</option>
                        <option value="left">left</option>
                        <option value="right">right</option>
                        <option value="top">top</option>
                        <option value="bottom">bottom</option>
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => removeValue(ai, vi)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => addValue(ai, false)}
                >
                  <Plus className="mr-0.5 h-2.5 w-2.5" />
                  Текст
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => addValue(ai, true)}
                >
                  <Plus className="mr-0.5 h-2.5 w-2.5" />
                  З freeSide
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
