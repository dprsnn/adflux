"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserMenuProps {
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export function UserMenu({ email, name, avatarUrl }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email[0].toUpperCase();

  async function handleSignOut() {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={name ?? email}
            className="h-8 w-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-card p-1 shadow-xl">
          <div className="px-3 py-2">
            {name && (
              <p className="text-sm font-medium text-foreground">{name}</p>
            )}
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            Кабінет
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-secondary"
          >
            Вийти
          </button>
        </div>
      )}
    </div>
  );
}
