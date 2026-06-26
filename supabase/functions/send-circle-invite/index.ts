Deno.serve(async (_req) => {
  return new Response(
    JSON.stringify({ ok: true, message: "send-circle-invite is alive" }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }
  );
});
