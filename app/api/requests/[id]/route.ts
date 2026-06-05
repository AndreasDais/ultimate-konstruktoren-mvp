import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

/**
 * GET /api/requests/[id]
 *
 * Public request resume/fork is disabled for launch. Request rows contain raw
 * user text and interpretation state, so they require owner/share-token
 * semantics before they can be exposed again.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return jsonNoStore({ error: "Manglar request_id" }, 400);
  }

  return jsonNoStore(
    {
      error: "request_resume_requires_owner_or_share_token",
      message:
        "Public request resume is disabled until owner or share-token access is available.",
    },
    403,
  );
}
