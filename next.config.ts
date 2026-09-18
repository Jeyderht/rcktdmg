import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Oculta el indicador flotante de Dev Tools de Next.js.
  // Es la opción oficial en Next 15.5: el propio tipo indica
  // "To disable, set `devIndicators` to `false`".
  devIndicators: false,
};

export default nextConfig;
