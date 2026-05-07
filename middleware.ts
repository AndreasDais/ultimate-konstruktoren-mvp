import { NextRequest, NextResponse } from "next/server";

// Middleware som beskyttar admin-grensesnittet med HTTP Basic Auth.
// Passordet ligg i miljøvariabel ADMIN_PASSWORD. Om det manglar,
// returnerer vi 500 så feilen blir tydeleg under utvikling.
//
// Brukarnamn er irrelevant — vi sjekkar berre passordet. Skriv kva du vil
// i brukarnamn-feltet i nettlesarens prompt, eller la det vere tomt.
export function middleware(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return new NextResponse(
      "Admin-passord er ikkje konfigurert. Set ADMIN_PASSWORD i .env.local.",
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const [type, encoded] = authHeader.split(" ");
    if (type === "Basic" && encoded) {
      try {
        // atob er tilgjengeleg i Edge Runtime
        const decoded = atob(encoded);
        const colonIndex = decoded.indexOf(":");
        // Alt etter første kolon er passord (brukarnamn ignorerast)
        const submittedPassword = decoded.slice(colonIndex + 1);
        if (submittedPassword === password) {
          return NextResponse.next();
        }
      } catch {
        // Ugyldig base64 — fall gjennom til 401
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Ultimate Konstruktoren Admin"',
    },
  });
}

export const config = {
  // Matchar både admin-sider og admin-API. Begge må vere bak passord.
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};