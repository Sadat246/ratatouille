import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { authorizeApiRole } from "@/lib/auth/api";
import { db } from "@/db/client";
import { consumerProfiles } from "@/db/schema";
import { jsonAuctionError } from "@/lib/auctions/http";
import { hasMockCardOnFile } from "@/lib/auctions/pricing";

export const runtime = "nodejs";

const mockCardSchema = z.object({
  enabled: z.boolean(),
  brand: z.string().trim().min(1).max(40).optional(),
  last4: z.string().regex(/^\d{4}$/).optional(),
});

function toMockCardPayload(profile: {
  hasMockCardOnFile: boolean;
  mockCardBrand: string | null;
  mockCardLast4: string | null;
  mockCardAddedAt: Date | null;
}) {
  return {
    enabled: hasMockCardOnFile(profile),
    brand: profile.mockCardBrand,
    last4: profile.mockCardLast4,
    addedAt: profile.mockCardAddedAt,
  };
}

export async function GET() {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  const profile = await db.query.consumerProfiles.findFirst({
    columns: {
      hasMockCardOnFile: true,
      mockCardBrand: true,
      mockCardLast4: true,
      mockCardAddedAt: true,
    },
    where: (table, operators) => operators.eq(table.userId, authorization.session.user.id),
  });

  if (!profile) {
    return jsonAuctionError(
      "CONSUMER_PROFILE_REQUIRED",
      "Complete shopper onboarding before managing the mock card.",
      404,
    );
  }

  return NextResponse.json({
    ok: true,
    mockCard: toMockCardPayload(profile),
  });
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  const payload = mockCardSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return jsonAuctionError(
      "INVALID_MOCK_CARD_REQUEST",
      payload.error.issues[0]?.message ?? "Provide a valid mock-card payload.",
      400,
    );
  }

  const now = new Date();
  const updateValues = payload.data.enabled
    ? {
        hasMockCardOnFile: true,
        mockCardBrand: payload.data.brand ?? "Visa",
        mockCardLast4: payload.data.last4 ?? "4242",
        mockCardAddedAt: now,
        updatedAt: now,
      }
    : {
        hasMockCardOnFile: false,
        mockCardBrand: null,
        mockCardLast4: null,
        mockCardAddedAt: null,
        updatedAt: now,
      };

  const [profile] = await db
    .update(consumerProfiles)
    .set(updateValues)
    .where(eq(consumerProfiles.userId, authorization.session.user.id))
    .returning({
      hasMockCardOnFile: consumerProfiles.hasMockCardOnFile,
      mockCardBrand: consumerProfiles.mockCardBrand,
      mockCardLast4: consumerProfiles.mockCardLast4,
      mockCardAddedAt: consumerProfiles.mockCardAddedAt,
    });

  if (!profile) {
    return jsonAuctionError(
      "CONSUMER_PROFILE_REQUIRED",
      "Complete shopper onboarding before managing the mock card.",
      404,
    );
  }

  return NextResponse.json({
    ok: true,
    mockCard: toMockCardPayload(profile),
  });
}
