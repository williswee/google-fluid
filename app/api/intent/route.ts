import { handleIntent } from "@/lib/server/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleIntent(request);
}
