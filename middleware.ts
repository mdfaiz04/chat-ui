import { withAuth } from "next-auth/middleware";

/**
 * Next-Auth Middleware
 * This middleware protects the listed routes.
 * If a user is not authenticated, they will be redirected to the sign-in page (in our case, the root page).
 */
export default withAuth({
  pages: {
    signIn: "/", // Redirect to home/landing if not authenticated
  },
});

// Configure which routes to protect
export const config = {
  matcher: [
    "/chat/:path*", // Protect all individual chat threads
    "/profile/:path*", // Future-proofing
  ],
};
