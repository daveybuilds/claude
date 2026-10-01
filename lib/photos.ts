// Your own photos. Drop image files into /public/images and put their paths
// here (e.g. "/images/hero.jpg"). Leave a slot as null to show the soft
// illustrated shape instead. Describe each photo in its `alt` text.

export const PHOTOS: Record<"hero" | "howItWorks" | "fridayList", { src: string | null; alt: string }> = {
  hero: { src: null, alt: "" },
  howItWorks: { src: null, alt: "" },
  fridayList: { src: null, alt: "" },
};
