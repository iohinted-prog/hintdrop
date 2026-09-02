import { createWorker } from "tesseract.js";
import path from "path";

// The White Company / Joy problem: their scraped "product image" is
// sometimes actually a marketing graphic - a promotional banner or
// badge with text baked into it - rather than a clean product photo.
// Unlike the Amazon fix (a URL-shape check, free and instant), there's
// no shortcut here: telling "has readable text overlaid on it" from
// "is a normal product photo" requires actually looking at the pixels.
// Cian chose free/local OCR (Tesseract.js) over a paid vision API for
// this, accepting the latency cost that comes with it.

// Tesseract.js's default behaviour is to fetch its ~3MB English
// language model from jsdelivr's CDN at runtime, on every cold start.
// Bundled locally instead - same reasoning as this repo's fonts
// (lib/fonts/, real TTF files rather than a live Google Fonts fetch,
// after that exact pattern broke production once before). A CDN fetch
// failure here would otherwise either silently degrade every OCR check
// to "no text found" (fail-open, see below) or, worse, crash the whole
// function outright (see errorHandler below) - bundling removes the
// dependency entirely rather than just handling its failure gracefully.
const LANG_DATA_PATH = path.join(process.cwd(), "lib", "tesseract-data");

// A pool rather than a single worker - Tesseract's own recognize()
// calls queue sequentially on one worker, so checking several
// candidate images per hint-add would otherwise happen one at a time
// (multiple seconds each, added up serially). A small pool lets
// several checks actually run concurrently instead.
const POOL_SIZE = 3;
let workerPoolPromise = null;
let nextWorkerIndex = 0;

function createWorkerPool() {
  // cachePath points Tesseract's own internal cache at /tmp, the one
  // writable directory in a Vercel function - workers are created once
  // per (possibly warm-reused) function instance and never torn down.
  //
  // errorHandler is not optional here, despite the name suggesting it
  // is: without it, a load failure both rejects this promise (fine,
  // catchable) AND separately throws synchronously inside an internal
  // message-handler callback (uncaught - crashes the whole function,
  // confirmed while testing this). Supplying any function here takes
  // the non-throwing branch in tesseract.js's own code instead.
  return Promise.all(
    Array.from({ length: POOL_SIZE }, () => createWorker("eng", 1, {
      langPath: LANG_DATA_PATH,
      cachePath: "/tmp",
      errorHandler: () => {},
    }))
  );
}

function getWorkerPool() {
  if (!workerPoolPromise) {
    workerPoolPromise = createWorkerPool().catch((err) => {
      // Reset so a transient failure (e.g. a corrupted /tmp cache
      // entry) doesn't permanently break OCR for the rest of this
      // warm instance's lifetime - the next call gets a fresh attempt.
      workerPoolPromise = null;
      throw err;
    });
  }
  return workerPoolPromise;
}

async function getNextWorker() {
  const pool = await getWorkerPool();
  const worker = pool[nextWorkerIndex % pool.length];
  nextWorkerIndex += 1;
  return worker;
}

// Below this many meaningful characters, treat it as noise rather than
// genuine overlaid text. Real product photos legitimately contain
// small bits of readable text sometimes (a tiny brand mark, a barcode,
// a size label) - this shouldn't reject those. The actual problem case
// (a promotional banner/badge baked into the whole image) reliably
// produces more text than this.
const MIN_TEXT_CHARS = 8;
// Tesseract reports 0-100 confidence per recognized word. Low-confidence
// "words" are usually noise picked up from image texture/edges, not
// real text - only counting confident words avoids false positives on
// busy/textured product photos that have no actual text on them.
const MIN_CONFIDENCE = 60;

const PER_IMAGE_TIMEOUT_MS = 9000;

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("OCR timed out")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Returns true if the image at `url` appears to have meaningful text
// baked into it.
export async function imageHasOverlaidText(url) {
  try {
    const worker = await getNextWorker();
    // Since Tesseract.js v6, only the plain `text` output is computed
    // by default — word-level confidence (needed to tell real text
    // from OCR noise) lives in the `blocks` output, which has to be
    // explicitly requested. Confirmed by testing: without this,
    // `result.data.words` is simply an empty array on every image,
    // real text or not.
    const result = await withTimeout(
      worker.recognize(url, {}, { blocks: true }),
      PER_IMAGE_TIMEOUT_MS
    );
    const words = (result?.data?.blocks || [])
      .flatMap((b) => b.paragraphs || [])
      .flatMap((p) => p.lines || [])
      .flatMap((l) => l.words || []);
    const meaningfulChars = words
      .filter((w) => (w.confidence ?? 0) >= MIN_CONFIDENCE)
      .reduce((sum, w) => sum + String(w.text || "").trim().length, 0);
    return meaningfulChars >= MIN_TEXT_CHARS;
  } catch {
    // Fail open - an OCR failure (timeout, unreachable image, a
    // hiccup fetching the language data) should never block someone
    // from adding a hint. Worst case a text-bearing image slips
    // through, same as before this existed at all.
    return false;
  }
}

// Only the first few candidates get checked, to keep total latency
// bounded (each check can take several seconds even with the pool).
// Anything beyond this is included unchecked rather than dropped -
// "unchecked" isn't the same as "known bad", and this only matters
// when there were already several other candidates ahead of it.
const MAX_CHECKED = 4;

// Filters a list of candidate image URLs down to ones without
// significant overlaid text. Order is preserved among survivors.
export async function filterImagesWithoutText(urls = []) {
  const toCheck = urls.slice(0, MAX_CHECKED);
  const rest = urls.slice(MAX_CHECKED);

  const results = await Promise.all(
    toCheck.map(async (url) => ({ url, hasText: await imageHasOverlaidText(url) }))
  );

  const survivors = results.filter((r) => !r.hasText).map((r) => r.url);
  return [...survivors, ...rest];
}
