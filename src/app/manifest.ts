import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Статки — облік активів",
    short_name: "Статки",
    description: "Крипто, акції та готівка в одному місці",
    lang: "uk",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a101c",
    theme_color: "#0a101c",
    categories: ["finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Операції", url: "/transactions", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
