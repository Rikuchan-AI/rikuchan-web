import { auth } from "@clerk/nextjs/server";

const STAFF_USER_IDS = (process.env.STAFF_USER_IDS || "").split(",").filter(Boolean);

export async function isStaff(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  return STAFF_USER_IDS.includes(userId);
}

export async function requireStaff(): Promise<string> {
  const { userId } = await auth();
  if (!userId || !STAFF_USER_IDS.includes(userId)) {
    throw new Error("Forbidden: staff only");
  }
  return userId;
}
