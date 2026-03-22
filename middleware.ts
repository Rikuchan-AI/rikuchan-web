import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/api/webhook(.*)",
]);

const isAdminOnlyRoute = createRouteMatcher([
  "/dashboard/api-keys(.*)",
  "/dashboard/billing(.*)",
  "/dashboard/plans(.*)",
  "/dashboard/settings(.*)",
  "/agents/settings(.*)",
  "/agents/gateway(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Public routes don't need auth
  if (isPublicRoute(req)) return;

  // Protect all non-public routes
  await auth.protect();

  // Admin-only route check
  if (isAdminOnlyRoute(req)) {
    const { orgId, orgRole } = await auth();

    // Personal (no org) = implicit admin — always passes
    if (!orgId) return;

    // Admin role passes
    if (orgRole === "org:admin") return;

    // Operator on admin-only route → redirect
    return NextResponse.redirect(new URL("/dashboard/restricted", req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
