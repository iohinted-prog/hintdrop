import { NextResponse } from "next/server";
import { isValidHttpUrl, buildAffiliateLink } from "@/lib/affiliates";

export async function POST(request) {
  try {
    const body = await request.json();
    const { network, merchant, destinationUrl } = body;

    if (!destinationUrl || !isValidHttpUrl(destinationUrl)) {
      return NextResponse.json(
        { error: "Missing or invalid destinationUrl" },
        { status: 400 }
      );
    }

    const result = buildAffiliateLink({
      network,
      merchant,
      destinationUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
