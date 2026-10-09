/** C-curve on the left edge — bulges into the text area for a visible wave */
export const HERO_IMAGE_CLIP_PATH =
  "M0,0 C0.14,0.34 0.14,0.66 0,1 L1,1 L1,0 Z";

export function HeroCurveDefs() {
  return (
    <svg aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden">
      <defs>
        <clipPath id="hero-image-clip" clipPathUnits="objectBoundingBox">
          <path d={HERO_IMAGE_CLIP_PATH} />
        </clipPath>
      </defs>
    </svg>
  );
}
