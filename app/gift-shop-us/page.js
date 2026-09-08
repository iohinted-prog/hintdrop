import GiftShopPageContent from "../gift-shop/GiftShopPageContent";

export const metadata = {
  title: "Gift Shop | HintDrop US",
  description: "Curated US gift ideas. Save your favourites to your HintDrop wishlist.",
};

// See app/gift-shop-uk/page.js for how visitors land here.
export default async function GiftShopUsPage() {
  return <GiftShopPageContent region="us" />;
}
