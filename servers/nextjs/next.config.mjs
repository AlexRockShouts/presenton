
const nextConfig = {
  reactStrictMode: false,
  distDir: ".next-build",
  

  // Rewrites for development - proxy font requests to FastAPI backend
  async rewrites() {
    return [
      {
        source: '/app_data/fonts/:path*',
        destination: 'http://localhost:8000/app_data/fonts/:path*',
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-7c765f3726084c52bcd5d180d51f1255.r2.dev",
      },
      {
        protocol: "https",
        hostname: "pptgen-public.ap-south-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "pptgen-public.s3.ap-south-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "img.icons8.com",
      },
      {
        protocol: "https",
        hostname: "present-for-me.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "yefhrkuqbjcblofdcpnr.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "unsplash.com",
      },
    ],
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback ??= {};
      config.resolve.fallback.https = false;
      config.resolve.fallback.fs = false;
      config.resolve.fallback.path = false;
      config.resolve.fallback.stream = false;
      config.resolve.fallback.crypto = false;
      config.resolve.fallback.tls = false;
      config.resolve.fallback.zlib = false;
      config.resolve.fallback["node:https"] = false;
      config.resolve.fallback["node:http"] = false;
      config.resolve.fallback["node:fs"] = false;
      config.resolve.fallback["node:path"] = false;
      config.resolve.fallback["node:stream"] = false;
      config.resolve.fallback["node:crypto"] = false;
      config.resolve.fallback["node:tls"] = false;
    }
    return config;
  },

};

export default nextConfig;
