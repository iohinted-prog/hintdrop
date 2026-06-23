"use server";

import { createClient } from "../../lib/supabase/server";

const ALLOWED_CURRENCIES = ["GBP", "EUR", "USD", "AUD", "CAD"];

const ALLOWED_INTERESTS = [
  "Home",
  "Food",
  "Beauty",
  "Tech",
  "Travel",
  "Wellness",
  "Books",
  "Fashion",
  "Experiences",
  "Music",
  "Gaming",
];

function parseBoolean(value, fallback = false) {
  if (value === true || value === "1" || value === 1 || value === "true") return true;
  if (value === false || value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

export async function saveSettings(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const rawInterests = Array.isArray(formData.interests) ? formData.interests : [];
  const interests = rawInterests.filter((item) => ALLOWED_INTERESTS.includes(item));

  if (interests.length < 2) {
    throw new Error("Please choose at least 2 interests.");
  }

  const currency = ALLOWED_CURRENCIES.includes(formData.currency)
    ? formData.currency
    : "GBP";

  const settings = {
    email_reminders: parseBoolean(formData.email_reminders, true),
    personalized_offers: parseBoolean(formData.personalized_offers, true),
    hint_sale_alerts: parseBoolean(formData.hint_sale_alerts, true),
    product_updates: parseBoolean(formData.product_updates, false),
    default_reminder_days: Number(formData.default_reminder_days) || 7,
    currency,
    interests,
  };

  const { error } = await supabase
    .from("profiles")
    .update(settings)
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  return { success: true };
}
