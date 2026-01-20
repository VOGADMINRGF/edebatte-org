
import NextAuth from "next-auth/next";
import Credentials from "next-auth/providers/credentials";

const creds = Credentials({
  name: "Credentials",
  credentials: {
    email: { label: "E-Mail", type: "text" },
    password: { label: "Passwort", type: "password" }
  },
  async authorize(creds) {
    const email = (creds?.email||"").toString().toLowerCase().trim();
    const pw = (creds?.password||"").toString();
    // DEV-Minimum: akzeptiere eine definierte Dev-User-Kombi via ENV (oder Demo)
    const devUser = process.env.NEXTAUTH_DEV_USER || "dev@edebatte.org";
    const devPass = process.env.NEXTAUTH_DEV_PASS || "devpass";
    if (process.env.NEXTAUTH_DEV_ALLOW === "1" && email === devUser && pw === devPass) {
      return { id: "dev-1", name: "Developer", email };
    }
    // TODO: Falls Prisma konfiguriert: hier echte Nutzerprüfung (bcrypt + prisma.user.findUnique)
    return null;
  }
});

const handler = NextAuth({
  providers: [creds],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
});
export const GET = handler;
export const POST = handler;
