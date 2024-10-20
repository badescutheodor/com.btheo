import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
    return NextResponse.json({ ok: 1 });
}

export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Allow': 'GET'
      }
    });
  }