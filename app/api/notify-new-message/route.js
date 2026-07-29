export async function POST(req) {
  const body = await req.json();

  const res = await fetch(
    "https://egdghdutgjcdvhazmblw.supabase.co/functions/v1/notify-new-message",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
