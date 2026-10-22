import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "./current-user";
import type { SessionUser } from "./session";

export type Role = SessionUser["role"];

/** For pages and layouts: anonymous visitors go to the login page, wrong role gets a 404. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await getCurrentSession();
  if (!session) redirect("/admin/login");
  if (!roles.includes(session.user.role)) notFound();
  return session.user;
}
