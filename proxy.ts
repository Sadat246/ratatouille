import { auth } from "@/auth";
import {
  getRoleHome,
  getRoleOnboardingPath,
  getRoleSignInPath,
  isAppRole,
  type AppRole,
} from "@/lib/auth/roles";

function redirectTo(requestUrl: URL, pathname: string) {
  return Response.redirect(new URL(pathname, requestUrl.origin));
}

function resolveSignedInRedirect(
  requestUrl: URL,
  role: AppRole | null,
  onboardingCompletedAt: Date | string | null | undefined,
) {
  if (!isAppRole(role)) {
    return redirectTo(requestUrl, "/");
  }

  if (!onboardingCompletedAt) {
    return redirectTo(requestUrl, getRoleOnboardingPath(role));
  }

  return redirectTo(requestUrl, getRoleHome(role));
}

function matchesPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const user = request.auth?.user;

  const protectedRoutes: Array<{ prefix: string; role: AppRole }> = [
    { prefix: "/shop", role: "consumer" },
    { prefix: "/sell", role: "business" },
  ];

  for (const route of protectedRoutes) {
    if (!matchesPath(pathname, route.prefix)) {
      continue;
    }

    if (!user) {
      return redirectTo(request.nextUrl, getRoleSignInPath(route.role));
    }

    if (!isAppRole(user.role)) {
      return redirectTo(request.nextUrl, getRoleOnboardingPath(route.role));
    }

    if (user.role !== route.role) {
      return resolveSignedInRedirect(
        request.nextUrl,
        user.role,
        user.onboardingCompletedAt,
      );
    }

    if (!user.onboardingCompletedAt) {
      return redirectTo(request.nextUrl, getRoleOnboardingPath(route.role));
    }
  }

  const onboardingRoutes: Array<{ prefix: string; role: AppRole }> = [
    { prefix: "/onboarding/consumer", role: "consumer" },
    { prefix: "/onboarding/business", role: "business" },
  ];

  for (const route of onboardingRoutes) {
    if (!matchesPath(pathname, route.prefix)) {
      continue;
    }

    if (!user) {
      return redirectTo(request.nextUrl, getRoleSignInPath(route.role));
    }

    if (isAppRole(user.role) && user.role !== route.role) {
      return resolveSignedInRedirect(
        request.nextUrl,
        user.role,
        user.onboardingCompletedAt,
      );
    }

    if (user.role === route.role && user.onboardingCompletedAt) {
      return redirectTo(request.nextUrl, getRoleHome(route.role));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|pwa-icon).*)"],
};
