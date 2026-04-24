import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import dbConnect from "./dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";

/**
 * NextAuth Configuration (Mongoose-only, No Adapter)
 */
export const authOptions: NextAuthOptions = {
  // We are NOT using an adapter (removed MongoDBAdapter)
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        try {
          await dbConnect();

          const user = await User.findOne({ email: credentials.email.toLowerCase() });

          if (!user) {
            throw new Error("No user found with this email");
          }

          if (!user.passwordHash) {
            throw new Error("This account is linked with a social provider. Please use Google or GitHub to log in.");
          }

          const isPasswordCorrect = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isPasswordCorrect) {
            throw new Error("Invalid password. Please try again.");
          }

          // Return user object for JWT
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image || null,
          };
        } catch (error: any) {
          console.error("[AUTH_CREDENTIALS_ERROR]", error.message);
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    /**
     * Handle Manual User Creation for OAuth
     */
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          await dbConnect();

          // Check if user exists
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            // Create user manually if they don't exist
            await User.create({
              name: user.name,
              email: user.email,
              image: user.image,
              provider: account.provider,
            });
            console.log(`[AUTH_SIGNIN] New ${account.provider} user created: ${user.email}`);
          } else {
            // Update image and name if they've changed
            await User.updateOne(
              { email: user.email },
              {
                $set: {
                  name: user.name,
                  image: user.image,
                  provider: account.provider // Ensure provider is correctly tracked
                }
              }
            );
          }
          return true;
        } catch (error) {
          console.error("[AUTH_SIGNIN_ERROR]", error);
          return false;
        }
      }
      return true;
    },

    /**
     * Map User Data to Token
     */
    async jwt({ token, user, account }) {
      // On initial sign in
      if (user) {
        if (account?.provider === "google" || account?.provider === "github") {
          // For OAuth, we need to fetch our internal MongoDB ID
          await dbConnect();
          const dbUser = await User.findOne({ email: user.email });
          if (dbUser) {
            token.id = dbUser._id.toString();
          }
        } else {
          // For Credentials, we already returned the id in authorize()
          token.id = user.id;
        }
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },

    /**
     * Map Token Data to Session
     */
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
};
