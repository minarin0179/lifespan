import { NextResponse } from "next/server";
import { getSnapshot } from "../../lib/runtimeState";

export async function GET() {
  // TODO: Convex接続後は query(api.agents.listAliveAgents) などで置換。
  return NextResponse.json(getSnapshot());
}
