import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET!;
  return new TextEncoder().encode(secret);
}

async function makeBackendToken(userId: string, email: string, role: string) {
  return new SignJWT({ id: userId, email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection("users").findOne({
          email: credentials.email,
        });
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;
        return {
          id:    user._id.toString(),
          email: user.email,
          name:  user.name,
          role:  user.role ?? "hr_manager",
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as any).role ?? "hr_manager";
      }
      // For Google sign-in, fetch or create the user record to get MongoDB _id
      if (account?.provider === "google" && token.email) {
        const client = await clientPromise;
        const db = client.db();
        const dbUser = await db.collection("users").findOne({ email: token.email });
        if (dbUser) {
          token.id   = dbUser._id.toString();
          token.role = dbUser.role ?? "hr_manager";
        }
      }
      if (token.id) {
        token.backendToken = await makeBackendToken(
          token.id as string,
          token.email as string,
          token.role as string ?? "hr_manager",
        );
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id          = token.id as string;
        (session.user as any).role         = token.role;
        (session as any).backendToken      = token.backendToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
});

export const runtime = "nodejs";