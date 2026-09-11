import ProductPageContent from "@/app/gift-shop/ProductPageContent";
import { buildProductMetadata, buildProductJsonLd } from "@/app/gift-shop/productMetadata";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return buildProductMetadata("uk", id);
}

export default async function ProductUkPage({ params }) {
  const { id } = await params;
  const jsonLd = await buildProductJsonLd("uk", id);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://hintdrop.app" },
      { "@type": "ListItem", position: 2, name: "Gift Shop", item: "https://hintdrop.app/gift-shop-uk" },
      ...(jsonLd ? [{ "@type": "ListItem", position: 3, name: jsonLd.name, item: jsonLd.url }] : []),
    ],
  };
  return (
    <>
      {jsonLd && (
        // eslint-disable-next-line react/no-danger
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <ProductPageContent region="uk" id={id} />
    </>
  );
}
