import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!slug || !/^[a-z0-9-]{3,50}$/.test(slug)) {
    return NextResponse.json({ available: false });
  }
  const existing = await db.query.businesses.findFirst({
    where: eq(businesses.slug, slug),
  });
  return NextResponse.json({ available: !existing });
}
