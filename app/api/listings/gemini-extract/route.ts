import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { runListingGeminiAutofill } from "@/lib/listings/gemini-autofill";
import { getSellerMembership } from "@/lib/listings/queries";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "business" || !session.user.onboardingCompletedAt) {
    return NextResponse.json(
      { error: "Only onboarded seller accounts can request Gemini listing extraction." },
      { status: 401 },
    );
  }

  const membership = await getSellerMembership(session.user.id);

  if (!membership) {
    return NextResponse.json(
      { error: "This seller account does not have a storefront membership yet." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const product = formData.get("product");
  const seal = formData.get("seal");
  const expiry = formData.get("expiry");

  if (!(product instanceof File) || product.size === 0) {
    return NextResponse.json({ error: "Missing product image." }, { status: 400 });
  }
  if (!(seal instanceof File) || seal.size === 0) {
    return NextResponse.json({ error: "Missing seal image." }, { status: 400 });
  }
  if (!(expiry instanceof File) || expiry.size === 0) {
    return NextResponse.json({ error: "Missing package-date image." }, { status: 400 });
  }

  const result = await runListingGeminiAutofill({ product, seal, expiry });

  return NextResponse.json(result);
}
