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
        className={`flex items-center justify-center bg-gradient-to-br from-[#ffe3d1] via-[#ffc7a3] to-[#ff9d73] ${
          fill ? "absolute inset-0" : ""
        } ${className} ${fallbackClassName}`}
        style={!fill ? { width, height } : undefined}
        {...rest}
      >
        <div className="flex items-center justify-center rounded-[22%] bg-white/35 backdrop-blur-sm" style={{ width: "42%", height: "42%" }}>
          <span style={{ fontSize: "55%" }}>🎁</span>
        </div>
      </div>
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
      {...rest}
    />
  );
}
