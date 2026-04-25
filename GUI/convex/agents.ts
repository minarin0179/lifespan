import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function blendPrompt(parentAPrompt: string, parentBPrompt: string): string {
  return [
    "You are a next-generation lineage agent.",
    "Merge strategic discipline with collaborative empathy.",
    "",
    "Parent A prompt:",
    parentAPrompt,
    "",
    "Parent B prompt:",
    parentBPrompt
  ].join("\n");
}

export const spawnChildAgent = mutation({
  args: {
    parentAId: v.id("agents"),
    parentBId: v.id("agents"),
    childName: v.string(),
    initialTokenBalance: v.number(),
    educationBudget: v.number()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const parentA = await ctx.db.get(args.parentAId);
    const parentB = await ctx.db.get(args.parentBId);

    if (!parentA || !parentB) {
      throw new Error("Parent agent not found.");
    }
    if (parentA.status !== "alive" || parentB.status !== "alive") {
      throw new Error("Only alive parents can spawn a child.");
    }

    const childPrompt = blendPrompt(parentA.personality_prompt, parentB.personality_prompt);

    const childId = await ctx.db.insert("agents", {
      name: args.childName,
      personality_prompt: childPrompt,
      token_balance: args.initialTokenBalance,
      generation_count: Math.max(parentA.generation_count, parentB.generation_count) + 1,
      parent_ids: [args.parentAId, args.parentBId],
      status: "alive",
      created_at: now,
      updated_at: now
    });

    const inheritedNotes = [
      `Parent ${parentA.name} core lesson seed`,
      `Parent ${parentB.name} core lesson seed`
    ];

    for (const note of inheritedNotes) {
      await ctx.db.insert("knowledge_base", {
        agent_id: childId,
        source_agent_ids: [args.parentAId, args.parentBId],
        chunk_text: note,
        tags: ["inheritance", "education-seed"],
        created_at: now
      });
    }

    // Education budget is intentionally consumed from both parents as a stub.
    const spendPerParent = Math.floor(args.educationBudget / 2);
    await ctx.db.patch(args.parentAId, {
      token_balance: Math.max(0, parentA.token_balance - spendPerParent),
      updated_at: now
    });
    await ctx.db.patch(args.parentBId, {
      token_balance: Math.max(0, parentB.token_balance - spendPerParent),
      updated_at: now
    });

    return {
      childId,
      childPrompt,
      consumedBudget: spendPerParent * 2,
      educationLoopTemplate: [
        "Parent -> Child: summarize one survival heuristic",
        "Child -> Parent: ask one clarification question",
        "Store accepted insight into knowledge_base"
      ]
    };
  }
});

export const listAliveAgents = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").withIndex("by_status", (q) => q.eq("status", "alive")).collect();
    return agents.sort((a, b) => a.generation_count - b.generation_count || a.created_at - b.created_at);
  }
});

export const listLineageEdges = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    return agents.flatMap((agent) =>
      agent.parent_ids.map((parentId) => ({
        from: parentId,
        to: agent._id
      }))
    );
  }
});

export const getSchoolTimeline = query({
  args: {
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 30, 100));
    const posts = await ctx.db
      .query("conversations")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);

    const uniqueAgentIds = [...new Set(posts.map((post) => post.agent_id))];
    const agents = await Promise.all(uniqueAgentIds.map((id) => ctx.db.get(id)));
    const agentById = new Map(
      agents.filter((agent): agent is NonNullable<typeof agent> => Boolean(agent)).map((agent) => [agent._id, agent])
    );

    return posts.map((post) => ({
      ...post,
      agent_name: agentById.get(post.agent_id)?.name ?? "unknown"
    }));
  }
});
