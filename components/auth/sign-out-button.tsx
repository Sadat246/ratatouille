import type { ReactNode } from "react";

import { signOut } from "@/auth";

type SignOutButtonProps = {
  label?: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function SignOutButton({
  label = "Sign out",
  className,
  ariaLabel,
}: SignOutButtonProps) {
  async function handleSignOut() {
    "use server";

    await signOut({ redirectTo: "/" });
  }

  return (
    <form action={handleSignOut}>
      <button
        type="submit"
        aria-label={ariaLabel}
        className={
          className ??
          "inline-flex items-center justify-center rounded-full border border-[#d6c0b1] px-4 py-2 text-sm font-semibold text-[#452f25] transition hover:border-[#b98e76] hover:text-[#241510]"
        }
      >
        {label}
      </button>
    </form>
  );
}
