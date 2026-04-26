/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: false,
    workerThreads: true,
    cpus: 1,
  },
};

export default nextConfig;
