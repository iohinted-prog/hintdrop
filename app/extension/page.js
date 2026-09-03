import ExtensionClient from "./ExtensionClient";

export const metadata = {
  title: "HintDrop Browser Extension",
  description: "Save gift ideas straight from any product page, without leaving your browser.",
  openGraph: {
    images: ["https://hintdrop.app/og-default.png"],
    title: "HintDrop Browser Extension",
    description: "Save gift ideas straight from any product page, without leaving your browser.",
    url: "https://hintdrop.app/extension",
    siteName: "HintDrop",
    type: "website",
  },
  alternates: { canonical: "https://hintdrop.app/extension" },
};

export default function ExtensionPage() {
  return <ExtensionClient />;
}
