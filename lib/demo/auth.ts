import "server-only";

import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { jsonAuctionError } from "@/lib/auctions/http";

import { DEMO_CONTROL_TOKEN_HEADER, getDemoControlToken, isDemoModeEnabled } from "./config";

export type DemoRequestAuthorization =
  | {
      ok: true;
      actor:
        | {
            kind: "token";
          }
        | {
            kind: "session";
            userId: string;
          };
    }
  | {
      ok: false;
      response: NextResponse;
    };

function readDemoToken(request: Request) {
  const bearer = request.headers.get("authorization");

  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim();
  }

  return request.headers.get(DEMO_CONTROL_TOKEN_HEADER)?.trim() ?? null;
}

export async function authorizeDemoRequest(
  request: Request,
): Promise<DemoRequestAuthorization> {
  if (!isDemoModeEnabled()) {
    return {
      ok: false,
      response: jsonAuctionError(
        "DEMO_MODE_DISABLED",
        "Demo controls are disabled on this deployment.",
        403,
      ),
    };
  }

  const configuredToken = getDemoControlToken();
  const requestToken = readDemoToken(request);

  if (configuredToken && requestToken === configuredToken) {
    return {
      ok: true,
      actor: {
        kind: "token",
      },
    };
  }

  const authorization = await authorizeApiRole("business");

  if (!authorization.ok) {
    return {
      ok: false,
      response: NextResponse.json(authorization.body, {
        status: authorization.status,
      }),
    };
  }

  return {
    ok: true,
    actor: {
      kind: "session",
      userId: authorization.session.user.id,
    },
  };
}
