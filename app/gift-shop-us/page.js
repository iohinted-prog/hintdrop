import GiftShopPageContent from "../gift-shop/GiftShopPageContent";

const title = "Gift Shop | HintDrop US";
const description = "Curated US gift ideas by occasion, relationship, and price. Save your favourites to your HintDrop wishlist.";

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
