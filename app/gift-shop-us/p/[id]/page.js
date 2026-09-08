import ProductPageContent from "@/app/gift-shop/ProductPageContent";
import { buildProductMetadata } from "@/app/gift-shop/productMetadata";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return buildProductMetadata("us", id);
}

export default async function ProductUsPage({ params }) {
  const { id } = await params;
  return <ProductPageContent region="us" id={id} />;
}
