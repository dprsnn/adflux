"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, Globe } from "lucide-react";
import { AnalysisLoader } from "@/components/analysis-loader";
import { toast } from "sonner";

interface GenerateProductDnaButtonProps {
  productId: string;
}

export function GenerateProductDnaButton({
  productId,
}: GenerateProductDnaButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  async function handleGenerate(withUrl: boolean) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/products/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          url: withUrl && url ? url : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Помилка аналізу");
      }

      toast.success("Product DNA згенеровано!");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Помилка аналізу";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="mt-4">
        <CardContent>
          <AnalysisLoader />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          onClick={() => setShowUrlInput(!showUrlInput)}
          size="sm"
          variant={showUrlInput ? "secondary" : "default"}
        >
          <Globe className="mr-1.5 h-3.5 w-3.5" />
          Аналіз за URL
        </Button>
        <Button
          onClick={() => handleGenerate(false)}
          size="sm"
          variant="outline"
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Аналіз за описом
        </Button>
      </div>

      {showUrlInput && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Аналіз за посиланням</CardTitle>
            <CardDescription className="text-xs">
              Вставте URL сторінки товару на сайті — ШІ проаналізує контент та створить Product DNA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/product/..."
                  className="pl-9"
                />
              </div>
              <Button
                onClick={() => handleGenerate(true)}
                disabled={!url}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Аналізувати
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
