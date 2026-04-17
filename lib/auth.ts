import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "./mongodb";
import connectToDatabase from "./mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";

// Debugging: Log status of environment variables
if (process.env.NODE_ENV !== "production") {
  console.log("NextAuth Environment Variables Check:", {
    hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
    hasGithubId: !!process.env.GITHUB_CLIENT_ID,
    nextAuthUrl: process.env.NEXTAUTH_URL,
  });
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
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
      authorization: {
        params: {
          prompt: "login",
        },
      },
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] Attempting credentials login for:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.error("[AUTH] ❌ Missing email or password in request");
          throw new Error("Missing email or password");
        }

        try {
          await connectToDatabase();
          console.log("[AUTH] Database connected successfully");

          const user = await User.findOne({ email: credentials.email.toLowerCase() });
          
          if (!user) {
            console.error("[AUTH] ❌ User not found with email:", credentials.email);
            throw new Error("No user found with this email");
          }

          console.log("[AUTH] User record found, checking password hash...");

          if (!user.passwordHash) {
            console.error("[AUTH] ❌ User has no passwordHash (OAuth account?)");
            throw new Error("This account is linked with a social provider. Please use Google or GitHub to log in.");
          }

          const isPasswordCorrect = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          console.log("[AUTH] Password comparison result:", isPasswordCorrect);

          if (!isPasswordCorrect) {
            console.error("[AUTH] ❌ Invalid password for user:", credentials.email);
            throw new Error("Invalid password. Please try again.");
          }

          console.log("[AUTH] ✅ Authentication successful for:", user.email);

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image || null,
          };
        } catch (error: any) {
          console.error("[AUTH] 🚨 Error during authorize:", error.message);
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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "github") {
        await connectToDatabase();
        // Update user provider tracking and ensure name/image are synced
        await User.updateOne(
          { email: user.email },
          {
            $set: {
              provider: account.provider,
              name: user.name, // Sync name from OAuth
              image: user.image // Sync image from OAuth
            }
          },
          { upsert: true }
        );
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Map initial login data
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }

      // Handle manual updates (if name is changed later)
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Map token data to session object
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
