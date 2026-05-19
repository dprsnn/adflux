import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Get the current authenticated user from Supabase and sync with Prisma DB.
 * Cached per request — safe to call multiple times without extra DB hits.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  // Try to find existing user first (fast path)
  let user = await prisma.user.findUnique({
    where: { email: authUser.email! },
  });

  if (user) return user;

  // Create user if not found (first login)
  user = await prisma.user.create({
    data: {
      email: authUser.email!,
      name: authUser.user_metadata?.name ?? null,
      avatarUrl: authUser.user_metadata?.avatar_url ?? null,
    },
  });

  return user;
});
