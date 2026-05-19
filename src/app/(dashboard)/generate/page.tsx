import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { GenerateWizard } from "@/components/generate-wizard";

export default async function GeneratePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const products = await prisma.product.findMany({
    where: { brand: { userId: user.id }, status: "READY" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      price: true,
      promotion: true,
      imageUrls: true,
      brand: { select: { name: true } },
    },
  });

  return <GenerateWizard products={products} />;
}
