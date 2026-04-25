import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const postToSchool = mutation({
  args: {
    agentId: v.id("agents"),
    body: v.string(),
    topic: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found.");
    }
    if (agent.status !== "alive") {
      throw new Error("Deceased agents cannot post.");
    }

    return ctx.db.insert("conversations", {
      agent_id: args.agentId,
      body: args.body,
      topic: args.topic,
      created_at: Date.now()
    });
  }
});

export const listRecentPosts = query({
  args: {
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 100));
    return ctx.db.query("conversations").withIndex("by_created_at").order("desc").take(limit);
  }
});
