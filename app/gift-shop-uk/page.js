import GiftShopPageContent from "../gift-shop/GiftShopPageContent";

const title = "Gift Shop | HintDrop UK";
const description = "Curated UK gift ideas by occasion, relationship, and price. Save your favourites as hints on HintDrop.";

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
