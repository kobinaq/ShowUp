import { staticFile } from "remotion";

const faces: Array<[string, string, number]> = [
  ["Inter", "fonts/inter-400.woff2", 400],
  ["Inter", "fonts/inter-500.woff2", 500],
  ["Inter", "fonts/inter-600.woff2", 600],
  ["Inter", "fonts/inter-700.woff2", 700],
  ["Space Grotesk", "fonts/space-400.woff2", 400],
  ["Space Grotesk", "fonts/space-500.woff2", 500],
  ["Space Grotesk", "fonts/space-600.woff2", 600],
  ["Space Grotesk", "fonts/space-700.woff2", 700]
];

export function FontFaces() {
  const css = faces
    .map(
      ([family, file, weight]) =>
        `@font-face{font-family:"${family}";src:url("${staticFile(file)}") format("woff2");font-weight:${weight};font-style:normal;font-display:block;}`
    )
    .join("\n");
  return <style>{css}</style>;
}
