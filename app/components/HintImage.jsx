"use client";
import { useState } from "react";
import Image from "next/image";

// Drop-in replacement for <img>, using next/image for optimization with a
// consistent, branded fallback (soft pastel gradient + gift logo) whenever
// there's no image, or the image fails to load — some external retailer
// hosts block third-party fetchers, so a graceful fallback matters here.
export default function HintImage({
  src,
  alt = "",
  fill = false,
  width,
  height,
  className = "",
  sizes,
  priority = false,
  fallbackClassName = "",
  onError,
  ...rest
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  function handleError(e) {
    setFailed(true);
    onError?.(e);
  }

  if (showFallback) {
    return (
      <div
        className={`bg-gradient-to-br from-[#ffe3d1] via-[#ffc7a3] to-[#ff9d73] ${
          fill ? "absolute inset-0" : ""
        } ${className} ${fallbackClassName}`}
        style={!fill ? { width, height } : undefined}
        {...rest}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      sizes={sizes || (fill ? "100vw" : undefined)}
      className={className}
      priority={priority}
      referrerPolicy="no-referrer"
      onError={handleError}
      // Every image this component ever renders is external and
      // uncontrolled (retailer product photos, Pexels stock photos,
      // whatever a saved link's preview turns up) - high cardinality,
      // effectively unlimited unique URLs, exactly what runs a
      // Vercel account out of its free-tier Image Optimization
      // quota (5,000 transformations/month - confirmed hit today,
      // via Vercel's own notification, not a guess). Once exhausted,
      // every further /_next/image request errors instead of
      // loading - explains the ASOS fallback and is a strong
      // candidate for the stuck hint-detail loading screen too,
      // and will keep recurring monthly as a structural certainty
      // given how many unique images this app handles, not a
      // one-off fluke.
      // unoptimized serves the src directly, bypassing Vercel's
      // optimizer (and its quota) entirely for these external
      // images - no more automatic resizing/WebP conversion by
      // Vercel, but most retailer CDNs already serve reasonably
      // sized images (several explicitly tuned this session:
      // Nordstrom, Walmart, Target, ASOS, generic Scene7), so the
      // trade-off is minor next to eliminating a real, live,
      // actively-recurring breakage.
      unoptimized
      {...rest}
    />
  );
}
