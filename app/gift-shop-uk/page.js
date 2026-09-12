import GiftShopPageContent from "../gift-shop/GiftShopPageContent";

const title = "Gift Ideas & Wishlists for Every Occasion | HintDrop UK";
const description = "Curated gift ideas for Christmas, birthdays, Mother's Day, Father's Day and more. Save favourites to your HintDrop wishlist by occasion or relationship.";

export const metadata = {
  title,
  description,
  openGraph: {
    images: ["https://hintdrop.app/og-default-v2.png"],
    title,
    description,
    url: "https://hintdrop.app/gift-shop-uk",
    siteName: "HintDrop",
    type: "website",
  },
  alternates: {
    canonical: "https://hintdrop.app/gift-shop-uk",
  },
};

// Arrived at directly (manual visit, bookmark, shared link) or via
// proxy.js redirecting the un-suffixed /gift-shop here based on the
// visitor's detected country. Visiting this URL directly is also the
// manual override, same as /shop-uk - proxy.js refreshes the region
// cookie whenever someone lands here.
export default async function GiftShopUkPage() {
  return <GiftShopPageContent region="uk" />;
}
