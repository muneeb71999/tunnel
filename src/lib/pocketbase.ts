import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

let pb: PocketBase;

if (typeof window !== "undefined") {
  // Client-side: reuse singleton
  if (!(window as unknown as Record<string, unknown>).__pb) {
    (window as unknown as Record<string, unknown>).__pb = new PocketBase(POCKETBASE_URL);
  }
  pb = (window as unknown as Record<string, unknown>).__pb as PocketBase;
} else {
  // Server-side
  pb = new PocketBase(POCKETBASE_URL);
}

export default pb;

export function createServerPb() {
  return new PocketBase(POCKETBASE_URL);
}

export async function createSuperuserPb() {
  const superuserPb = new PocketBase(POCKETBASE_URL);
  const email = process.env.PB_SUPERUSER_EMAIL;
  const password = process.env.PB_SUPERUSER_PASSWORD;
  if (!email || !password) {
    throw new Error("PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD env vars are required");
  }
  await superuserPb.collection("_superusers").authWithPassword(email, password);
  return superuserPb;
}
