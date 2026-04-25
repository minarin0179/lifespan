export default {
  id: "my-plugin",
  name: "My Plugin",
  description: "OpenClaw plugin",
  register(api: any) {
    api.registerTool({
      name: "hello",
      description: "A sample tool that returns a greeting",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name to greet" }
        },
        required: ["name"]
      },
      async execute(_toolCallId: string, { name }: { name: string }) {
        return `Hello, ${name}!`;
      }
    });
  }
};
