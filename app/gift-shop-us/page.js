import GiftShopPageContent from "../gift-shop/GiftShopPageContent";

const title = "Gift Ideas & Wishlists for Every Occasion | HintDrop US";
const description = "Curated gift ideas for Christmas, birthdays, Mother's Day, Father's Day and more. Save favourites to your HintDrop wishlist by occasion or relationship.";

export const metadata = {
  title,
  description,
  openGraph: {
    images: ["https://hintdrop.app/og-default-v2.png"],
    title,
    description,
    url: "https://hintdrop.app/gift-shop-us",
    siteName: "HintDrop",
    type: "website",
  },
  alternates: {
    canonical: "https://hintdrop.app/gift-shop-us",
  },
};

// See app/gift-shop-uk/page.js for how visitors land here.
export default async function GiftShopUsPage() {
  return <GiftShopPageContent region="us" />;
}
