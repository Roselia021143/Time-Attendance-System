import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// ให้ `next dev` เข้าถึง D1 local ได้
initOpenNextCloudflareForDev();
