import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    name: v.string(),
    personality_prompt: v.string(),
    token_balance: v.number(),
    generation_count: v.number(),
    parent_ids: v.array(v.id("agents")),
    status: v.union(v.literal("alive"), v.literal("deceased")),
    created_at: v.number(),
    updated_at: v.number()
  })
    .index("by_status", ["status"])
    .index("by_generation", ["generation_count"]),

  conversations: defineTable({
    agent_id: v.id("agents"),
    body: v.string(),
    topic: v.optional(v.string()),
    created_at: v.number()
  })
    .index("by_agent", ["agent_id"])
    .index("by_created_at", ["created_at"]),

  knowledge_base: defineTable({
    agent_id: v.id("agents"),
    source_agent_ids: v.array(v.id("agents")),
    chunk_text: v.string(),
    embedding: v.optional(v.array(v.number())),
    tags: v.array(v.string()),
    created_at: v.number()
  })
    .index("by_agent", ["agent_id"])
    .index("by_created_at", ["created_at"])
});
