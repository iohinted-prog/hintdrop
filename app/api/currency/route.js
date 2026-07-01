export async function GET() {
  try {
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=GBP&to=EUR,USD,AUD,CAD",
      { next: { revalidate: 3600 } }
    );
    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: "Failed to fetch rates" }, { status: 500 });
  }
}
