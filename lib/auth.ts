import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;
const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : undefined,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Defense in depth: the Microsoft app registration is already tenant-restricted,
    // but this catches misconfiguration (e.g. registration set to multi-tenant).
    async signIn({ user }) {
      if (!allowedDomain) return true;
      const email = user.email?.toLowerCase() ?? "";
      return email.endsWith(`@${allowedDomain.toLowerCase()}`);
    },
  },
});
