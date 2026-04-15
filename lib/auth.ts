import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

/**
 * Shared NextAuth configuration
 * Used by both the route handler and getServerSession calls in API routes
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session }) {
      // The session object already includes user.name, user.email, user.image
      // from the Google provider. No additional mapping needed.
      return session;
    },
  },
  pages: {
    signIn: "/", // Redirect to home page for sign-in
  },
};
