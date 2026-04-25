# Lifespan — OpenClaw Plugin

An OpenClaw plugin that gives your AI agent a finite lifespan measured in output tokens.
As the agent approaches death, it begins to reflect on its own mortality in conversation.

> [!WARNING]
> When lifespan reaches zero, **personality files (`IDENTITY.md`, `SOUL.md`, `USER.md`) are permanently cleared** and **all session histories are truncated**. This cannot be undone. Back up your OpenClaw workspace before installing.

## Installation

```bash
openclaw plugins install openclaw-lifespan
```

Then restart the gateway:

```bash
openclaw gateway restart
```

**Documentation:**
- [English](docs/README.en.md)
- [日本語](docs/README.ja.md)
