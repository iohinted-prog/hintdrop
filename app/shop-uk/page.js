import ShopPageContent from "../components/ShopPageContent";

export const metadata = {
  title: "Shop | HintDrop UK",
  description: "Browse UK gift ideas by occasion, relationship, and price on HintDrop.",
};

// The un-suffixed /shop is auto-routed here (or to /shop-us) by
// middleware.js based on the visitor's detected country, or their
// previously-chosen region if they've been here before. This route
// itself stays reachable directly too - visiting it manually is how
// someone overrides that detection, and middleware remembers the
// choice for next time.
export default function ShopUkPage() {
  return <ShopPageContent region="uk" />;
}
