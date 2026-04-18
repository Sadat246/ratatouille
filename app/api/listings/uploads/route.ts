import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getSellerMembership } from "@/lib/listings/queries";
import { requiredListingImageKinds } from "@/lib/listings/shared";
import { storeListingImage } from "@/lib/listings/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "business" || !session.user.onboardingCompletedAt) {
    return NextResponse.json(
      {
        error: "Only onboarded seller accounts can upload listing images.",
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
  const kindValue = formData.get("kind");
  const fileValue = formData.get("file");

  if (
    typeof kindValue !== "string" ||
    !requiredListingImageKinds.includes(kindValue as (typeof requiredListingImageKinds)[number])
  ) {
    return NextResponse.json(
      {
        error: "Listing uploads need a valid photo slot.",
      },
      {
        status: 400,
      },
    );
  }

  const kind = kindValue as (typeof requiredListingImageKinds)[number];

  if (!(fileValue instanceof File)) {
    return NextResponse.json(
      {
        error: "Listing uploads require an image file.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const asset = await storeListingImage(fileValue, kind);

    return NextResponse.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}
