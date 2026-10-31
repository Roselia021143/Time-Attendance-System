import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

export const db = () => drizzle(getCloudflareContext().env.DB, { schema });
export { schema };
