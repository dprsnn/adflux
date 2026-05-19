import { BrandForm } from "@/components/brand-form";

export default function NewBrandPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Новий бренд</h1>
        <p className="mt-1 text-muted-foreground">
          Створіть бренд вручну або скористайтесь автоматичним аналізом за URL
        </p>
      </div>
      <BrandForm />
    </div>
  );
}
