import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ratatouille",
    short_name: "Ratatouille",
    description:
      "A marketplace for sealed grocery deals that move fast before expiry.",
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: "#f5e8d5",
    theme_color: "#f75d36",
    categories: ["shopping", "food"],
    icons: [
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
