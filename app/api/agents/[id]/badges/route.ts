import { NextResponse } from "next/server"
import { getAllBadges } from "@/lib/agents/badges"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const badges = getAllBadges(id)

    return NextResponse.json(
      {
        badges,
        count: badges.length,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return NextResponse.json(
      {
        badges: [],
        count: 0,
        error: error instanceof Error ? error.message : "Failed to load badges",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    )
  }
}
