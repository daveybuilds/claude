import Image from "next/image";
import { PHOTOS } from "@/lib/photos";

/**
 * A rounded, organic frame for one of your photos (see lib/photos.ts).
 * Until a photo is added it shows a soft painted shape, never a stock image.
 */
export function PhotoSlot({
  slot,
  className = "",
  sizes = "(min-width: 1024px) 480px, 90vw",
  priority = false,
}: {
  slot: keyof typeof PHOTOS;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const photo = PHOTOS[slot];
  return (
    <div className={`relative overflow-hidden rounded-[2.5rem_3.5rem_2.75rem_4rem] ${className}`}>
      {photo.src ? (
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="h-full w-full">
          <rect width="400" height="300" fill="var(--rose-soft)" />
          <path d="M-20 210C40 150 120 170 190 200s150 40 230-10v130H-20Z" fill="var(--sage-soft)" />
          <path d="M260 40c50-10 110 20 120 70s-30 80-80 80-90-30-90-75 0-65 50-75Z" fill="var(--lavender-soft)" />
          <circle cx="110" cy="105" r="46" fill="var(--rose)" opacity=".55" />
          <circle cx="160" cy="125" r="30" fill="var(--lavender)" opacity=".6" />
        </svg>
      )}
    </div>
  );
}
