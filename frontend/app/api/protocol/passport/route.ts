import { NextRequest, NextResponse } from "next/server";
import { applyTemplate } from "../../../../src/lib/passport-templates";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = applyTemplate(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ passport: result.config }, { status: 201 });
}
