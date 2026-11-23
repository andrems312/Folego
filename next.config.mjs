/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Em dev atrás de proxy, as requisições a /_next/* chegam por 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
