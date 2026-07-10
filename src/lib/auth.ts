import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const psychologist = await prisma.psychologist.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!psychologist) return null;

        const valid = await bcrypt.compare(password, psychologist.passwordHash);
        if (!valid) return null;

        return {
          id: psychologist.id,
          email: psychologist.email,
          name: psychologist.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.psychologistId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.psychologistId as string;
      }
      return session;
    },
  },
});
