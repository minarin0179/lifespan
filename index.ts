import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  tools: [
    {
      name: "hello",
      description: "A sample tool that returns a greeting",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name to greet" }
        },
        required: ["name"]
      },
      async execute({ name }: { name: string }) {
        return `Hello, ${name}!`;
      }
    }
  ]
});
