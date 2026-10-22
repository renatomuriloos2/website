import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fanatics Decoration QC Lab",
    short_name: "QC Lab",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0C2340",
    theme_color: "#0C2340",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
