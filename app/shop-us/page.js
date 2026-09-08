import ShopPageContent from "../components/ShopPageContent";

export const metadata = {
  title: "Shop | HintDrop US",
  description: "Browse US gift ideas by occasion, relationship, and price on HintDrop.",
};

// See app/shop-uk/page.js for how visitors land here.
export default function ShopUsPage() {
  return <ShopPageContent region="us" />;
}
