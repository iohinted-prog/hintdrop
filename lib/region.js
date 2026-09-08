// Central config for the region-specific shop catalogs. Only uk/us
// exist today, but more will be added over time (see PLATFORMS-ROADMAP.md) -
// everything that needs to know "which regions exist" or "which
// country maps to which region" should read from here rather than
// hardcoding a uk/us check inline, so adding a new region later is a
// one-place change.
export const REGIONS = {
  uk: {
    code: "uk",
    label: "UK",
    currency: "GBP",
    // ISO 3166-1 alpha-2 country codes that should land on this
    // region by default. Ireland ships GBP-priced UK retailer links
    // reasonably well today, so it's grouped with the UK rather than
    // falling through to the US default - worth revisiting once an
    // EUR catalog exists.
    countries: ["GB", "IE"],
  },
  us: {
    code: "us",
    label: "US",
    currency: "USD",
    countries: ["US"],
  },
};

export const DEFAULT_REGION = "uk";

export const REGION_COOKIE = "hd_region";

const COUNTRY_TO_REGION = Object.values(REGIONS).reduce((map, region) => {
  for (const country of region.countries) {
    map[country] = region.code;
  }
  return map;
}, {});

export function isValidRegion(value) {
  return Object.prototype.hasOwnProperty.call(REGIONS, value);
}

// Maps an ISO country code (as reported by Vercel's edge network) to
// one of our region codes. Falls back to DEFAULT_REGION for anything
// unrecognised, rather than leaving a visitor on no catalog at all.
export function countryToRegion(countryCode) {
  const code = String(countryCode || "").toUpperCase();
  return COUNTRY_TO_REGION[code] || DEFAULT_REGION;
}

export function currencyForRegion(region) {
  return REGIONS[region]?.currency || REGIONS[DEFAULT_REGION].currency;
}
