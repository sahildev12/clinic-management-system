import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/images/hero/**",
      },
    ],
  },
};

export default nextConfig;
