import { useState } from "react";
import { getProductEmoji, getProductImageUrl } from "@/lib/productImage";

interface Props {
  name: string;
  photo?: string;
  size?: number;
  className?: string;
}

export function ProductAvatar({ name, photo, size = 48, className = "" }: Props) {
  const emoji = getProductEmoji(name);
  const [imgFailed, setImgFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary ${className}`}
    >
      {photo ? (
        <img src={photo} alt={name} className="h-full w-full object-cover" />
      ) : emoji ? (
        <span style={{ fontSize: size * 0.55 }} aria-hidden>
          {emoji}
        </span>
      ) : !imgFailed ? (
        <img
          src={getProductImageUrl(name)}
          alt={name}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span style={{ fontSize: size * 0.45 }} className="font-black">
          {initial}
        </span>
      )}
    </div>
  );
}
