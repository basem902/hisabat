import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "حسابات المبنى",
    short_name: "حسابات",
    description: "نظام إدارة مدفوعات ومصروفات المبنى الشهرية",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "المدفوعات",
        short_name: "مدفوعات",
        url: "/payments",
      },
      {
        name: "المصروفات",
        short_name: "مصروفات",
        url: "/expenses",
      },
      {
        name: "المتأخرات",
        short_name: "متأخرات",
        url: "/outstandings",
      },
      {
        name: "التقارير",
        short_name: "تقارير",
        url: "/reports",
      },
    ],
  };
}
