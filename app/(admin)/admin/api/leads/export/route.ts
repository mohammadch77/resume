import { leadsCsv, shamsiDate } from "@/lib/admin/leads";
import { getCurrentSession } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * GET: every lead as a CSV download. Owner only. The proxy already requires a valid session for this path; the role
 * is checked here again, and a wrong role gets a 404 like every other owner-only page.
 */
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.user.role !== "owner") return new Response("Not found", { status: 404 });

  const csv = await leadsCsv(getDb());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${shamsiDate(new Date()).replaceAll("/", "-")}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
