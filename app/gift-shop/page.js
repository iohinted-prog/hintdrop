import GiftShopPageContent from "./GiftShopPageContent";

// This un-suffixed route is intercepted by proxy.js and redirected to
// /gift-shop-uk or /gift-shop-us based on the visitor's detected
// country (same pattern as /shop -> /shop-uk|us). This file is a
// fallback for the rare case proxy.js doesn't run first - matches
// app/shop/page.js, which does the same thing for /shop.
export default async function GiftShopPage() {
  return <GiftShopPageContent region="uk" />;
}
