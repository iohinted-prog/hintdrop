import { createClient } from "../supabase/server";

export async function getUserCurrency() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "GBP";

  const { data } = await supabase
    .from("profiles")
    .select("currency")
    .eq("id", user.id)
    .single();

  return data?.currency || "GBP";
}
