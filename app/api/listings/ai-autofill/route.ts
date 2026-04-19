import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { runListingGeminiAutofill } from "@/lib/listings/gemini-autofill";
import { getSellerMembership } from "@/lib/listings/queries";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "business" || !session.user.onboardingCompletedAt) {
    return NextResponse.json(
      { error: "Only onboarded seller accounts can request AI autofill." },
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
    return NextResponse.json(
      { error: "AI autofill requires a product image file." },
      { status: 400 },
    );
  }

  const sealFile = seal instanceof File && seal.size > 0 ? seal : undefined;
  const expiryFile = expiry instanceof File && expiry.size > 0 ? expiry : undefined;

  const result = await runListingGeminiAutofill({
    product,
    seal: sealFile,
    expiry: expiryFile,
  });

  return NextResponse.json(result);
}
