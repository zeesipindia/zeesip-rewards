import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NOTE: We use status 307 (Temporary Redirect) instead of 301 or 308.
// The main zeesip.com domain will later host the official Zee Sip brand website,
// so this redirect is temporary while the coming-soon rewards campaign is active
// and must NOT be cached permanently by browsers or CDNs.

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") || "";
  // Strip any port number from host header before comparing (e.g. zeesip.com:3000 -> zeesip.com)
  const host = hostHeader.split(":")[0].toLowerCase();

  if (host === "zeesip.com" || host === "www.zeesip.com") {
    const url = request.nextUrl.clone();
    url.hostname = "rewards.zeesip.com";
    url.protocol = "https";
    url.port = "";

    // Add query param src=bottle_qr if src is not already present
    if (!url.searchParams.has("src")) {
      url.searchParams.set("src", "bottle_qr");
    }

    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
