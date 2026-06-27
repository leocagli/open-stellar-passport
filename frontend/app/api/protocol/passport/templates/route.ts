import { NextResponse } from "next/server";
import { PASSPORT_TEMPLATES } from "../../../../../src/lib/passport-templates";

export async function GET() {
  return NextResponse.json(PASSPORT_TEMPLATES);
}
