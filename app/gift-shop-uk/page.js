import GiftShopPageContent from "../gift-shop/GiftShopPageContent";

export const metadata = {
  title: "Gift Shop | HintDrop UK",
  description: "Curated UK gift ideas. Save your favourites to your HintDrop wishlist.",
};

// Arrived at directly (manual visit, bookmark, shared link) or via
// proxy.js redirecting the un-suffixed /gift-shop here based on the
// visitor's detected country. Visiting this URL directly is also the
// manual override, same as /shop-uk - proxy.js refreshes the region
// cookie whenever someone lands here.
export default async function GiftShopUkPage() {
  return <GiftShopPageContent region="uk" />;
}
