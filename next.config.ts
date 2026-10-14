import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.HEALTHY_STEPS_AUTH_TEST === "1" ? ".next-auth-test" : ".next",
  poweredByHeader: false,
  devIndicators: false,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ] }];
  }
};
export default config;
