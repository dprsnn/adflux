import { redirect } from "next/navigation";

// Redirect /brands to /dashboard which shows the brands list
export default function BrandsPage() {
  redirect("/dashboard");
}
