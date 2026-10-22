import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fanatics Decoration QC Lab",
    short_name: "QC Lab",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09203F",
    theme_color: "#09203F",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
