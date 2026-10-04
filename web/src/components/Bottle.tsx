import type { WineType } from "../data/types";
const slots: Record<WineType, number> = {
  Red: 0,
  White: 1,
  Rosé: 2,
  Sparkling: 3,
  Orange: 4,
  Dessert: 5,
  Fortified: 5,
};
/** Generated generic artwork, not a photograph of the named wine. */
export function Bottle({
  type,
  className = "",
}: {
  type: WineType;
  className?: string;
}) {
  const index = slots[type];
  return (
    <div
      className={`bottle ${className}`}
      role="img"
      aria-label={`Illustrative ${type.toLowerCase()} wine bottle`}
      style={{
        backgroundPosition: `${78 - [355, 770, 1185][index % 3] * 0.43}px ${index < 3 ? 0 : -220}px`,
      }}
    />
  );
}
