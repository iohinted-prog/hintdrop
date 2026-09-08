import ProductPageContent from "@/app/gift-shop/ProductPageContent";
import { buildProductMetadata } from "@/app/gift-shop/productMetadata";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return buildProductMetadata("uk", id);
}

export default async function ProductUkPage({ params }) {
  const { id } = await params;
  return <ProductPageContent region="uk" id={id} />;
}
