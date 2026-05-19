"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteBrandButtonProps {
  brandId: string;
  brandName: string;
}

export function DeleteBrandButton({
  brandId,
  brandName,
}: DeleteBrandButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/brands/${brandId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Бренд "${brandName}" видалено`);
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error("Не вдалося видалити бренд");
        setDeleting(false);
        setConfirming(false);
      }
    } catch {
      toast.error("Помилка з'єднання");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      onBlur={() => setConfirming(false)}
      disabled={deleting}
      className={confirming ? "border-destructive text-destructive" : ""}
    >
      {deleting ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
      )}
      {confirming ? "Підтвердити?" : "Видалити"}
    </Button>
  );
}
