"use client";

import { createClient } from "@/lib/supabase/client";
import ShareButton from "./ShareButton";

export default function ProductShareButton({ region, id, title, priceText }) {
  const supabase = createClient();

  return (
    <ShareButton
      supabase={supabase}
      subjectType="gift_shop_product"
      subjectId={id}
      path={`/gift-shop-${region}/p/${id}`}
      title={title}
      text={priceText ? `${title} — ${priceText}` : title}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[#f1dfd6] bg-white px-6 text-[14px] font-semibold text-slate-700 hover:border-[#e37b57] hover:text-[#e37b57] sm:w-auto"
      label="Share"
    />
  );
}
