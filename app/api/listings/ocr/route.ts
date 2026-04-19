import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { runListingOcr } from "@/lib/listings/ocr";
import { getSellerMembership } from "@/lib/listings/queries";

export const runtime = "nodejs";

const FEATURE_DISABLED: boolean = true;

export async function POST(request: Request) {
  if (FEATURE_DISABLED) {
    return NextResponse.json(
      { error: "OCR is temporarily disabled." },
      { status: 503 },
    );
  }

  const session = await getSession();

  if (!session?.user || session.user.role !== "business" || !session.user.onboardingCompletedAt) {
    return NextResponse.json(
      {
        error: "Only onboarded seller accounts can request listing OCR.",
      },
      {
        status: 401,
      },
    );
  }

  const membership = await getSellerMembership(session.user.id);

  if (!membership) {
    return NextResponse.json(
      {
        error: "This seller account does not have a storefront membership yet.",
      },
      {
        status: 403,
      },
    );
  }

  const formData = await request.formData();
  const fileValue = formData.get("file");

  if (!(fileValue instanceof File)) {
    return NextResponse.json(
      {
        error: "OCR requests require an expiry image file.",
      },
      {
        status: 400,
      },
    );
  }

  const result = await runListingOcr(fileValue);

  return NextResponse.json(result);
}
