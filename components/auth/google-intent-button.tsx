import { signIn } from "@/auth";
import { getPostAuthPath } from "@/lib/auth/intent";
import type { AppRole } from "@/lib/auth/roles";

type GoogleIntentButtonProps = {
  role: AppRole;
  label: string;
};

export function GoogleIntentButton({
  role,
  label,
}: GoogleIntentButtonProps) {
  async function startGoogleSignIn() {
    "use server";

    await signIn("google", {
      redirectTo: getPostAuthPath(role),
    });
  }

  return (
    <form action={startGoogleSignIn} className="w-full">
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-full bg-[#1f1410] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#38231c]"
      >
        {label}
      </button>
    </form>
  );
}
