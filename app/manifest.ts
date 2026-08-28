import type { MetadataRoute } from "next";
import { COMPANY } from "../company.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: COMPANY.pageTitle,
    short_name: COMPANY.name,
    description: COMPANY.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffe1ee",
    theme_color: "#ff8fc0",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
