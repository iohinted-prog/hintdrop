import AsyncStorage from "@react-native-async-storage/async-storage";

// Mirrors lib/region.js (web) - same regions, same codes/labels/
// currencies, same default. Web persists the chosen region in a
// cookie (hd_region); mobile has no cookie jar, so this uses
// AsyncStorage under the same conceptual key instead. Only uk/us
// exist today on web too - adding a third region later is a
// one-place change here just as it is there.
export const REGIONS = {
  uk: { code: "uk", label: "UK", currency: "GBP" },
  us: { code: "us", label: "US", currency: "USD" },
};

export const DEFAULT_REGION = "uk";
const REGION_STORAGE_KEY = "hd_region";

export function isValidRegion(value) {
  return Object.prototype.hasOwnProperty.call(REGIONS, value);
}

export async function getStoredRegion() {
  try {
    const stored = await AsyncStorage.getItem(REGION_STORAGE_KEY);
    return isValidRegion(stored) ? stored : DEFAULT_REGION;
  } catch {
    return DEFAULT_REGION;
  }
}

export async function setStoredRegion(region) {
  if (!isValidRegion(region)) return;
  try {
    await AsyncStorage.setItem(REGION_STORAGE_KEY, region);
  } catch {
    // best-effort, same as web's try/catch around document.cookie
  }
}
