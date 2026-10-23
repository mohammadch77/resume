import { leadsCsv, shamsiDate } from "@/lib/admin/leads";
import { authenticateAdminRequest } from "@/lib/auth/request-auth";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * GET: every lead as a CSV download. Owner only. The proxy already requires a valid session for this path; the role
 * is checked here again, and a wrong role gets a 404 like every other owner-only page.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdminRequest(request, ["owner"]);
  if (!auth.ok) return new Response(auth.code === "forbidden" ? "Not found" : "Unauthorized", { status: auth.code === "forbidden" ? 404 : auth.status });

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
