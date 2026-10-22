import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Fanatics Decoration QC Lab",
    short_name: "QC Lab",
    description: "Fabric decoration-readiness portal",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#09203F",
    theme_color: "#09203F",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Lot board", url: "/board" },
      { name: "CAPA", url: "/capa" },
      { name: "Submit lot", url: "/lots/new" },
    ],
  };
}
