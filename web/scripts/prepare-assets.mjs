import sharp from "sharp";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Wine } from "@phosphor-icons/react";
import { writeFile } from "node:fs/promises";

// Preserve the generated source; only compress the delivery format.
await sharp("assets/wine-bottles-source.png")
  .webp({ quality: 85, alphaQuality: 95 })
  .toFile("public/images/wine-bottles.webp");
const favicon = renderToStaticMarkup(
  createElement(Wine, { size: 32, color: "#742c42", weight: "regular" }),
);
await writeFile("public/favicon.svg", favicon);
