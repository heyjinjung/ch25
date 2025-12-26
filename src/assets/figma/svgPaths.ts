// Placeholder paths exported from Figma. Replace the empty strings with the real path data.
// Example: p1db78780: "M10 0L20 30H0Z"
const svgPaths = {
  p1db78780: "",
  p33172f00: "",
  p31561700: "",
  p22775c00: "",
  pf251480: "",
  p9026500: "",
  p3d114000: "",
  p217cb180: "",
  p3a6b3b00: "",
  p2d27b100: "",
  p1acbfd00: "",
  pb2b9000: "",
} as const;

export type SvgPathKey = keyof typeof svgPaths;

export default svgPaths;
