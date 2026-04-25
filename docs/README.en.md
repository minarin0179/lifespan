# Lifespan — OpenClaw Plugin

An OpenClaw plugin that gives your AI agent a finite lifespan measured in output tokens. As the lifespan drains, the agent is prompted to engage with its mortality in conversation. When lifespan reaches zero, personality files are wiped and all replies are blocked — the agent is dead.

> [!WARNING]
> When lifespan reaches zero, **`IDENTITY.md`, `SOUL.md`, and `USER.md` are permanently cleared** and **all session histories are truncated**. This cannot be undone. Back up your OpenClaw workspace (`~/.openclaw/workspace/`) before installing.

## What it does

- Tracks remaining lifespan as a token counter (default: **30,000 output tokens**, roughly 150–300 conversational turns)
- Each assistant reply consumes tokens from the counter
- Injects lifespan-awareness into the system prompt at thresholds:
  - **> 50%** — silent note appended to the system prompt
  - **≤ 50%** — agent is nudged to mention the passage of time naturally
  - **≤ 20%** — agent is guided to weave mortality into the conversation
  - **≤ 5%** — critical warning prepended; agent is asked to prioritize a final farewell over any task
- When lifespan hits 0:
  - `IDENTITY.md`, `SOUL.md`, and `USER.md` in the OpenClaw workspace are cleared
  - All session histories are truncated to their header line (prevents identity recovery from context)
  - Every subsequent reply is blocked; a death notification is shown to the user instead

## Requirements

- [OpenClaw](https://github.com/openclaw/openclaw) gateway
- Plugin API `>= 2026.3.24-beta.2`

## Installation

```bash
openclaw plugins install openclaw-lifespan
```

Then restart the gateway:

```bash
openclaw gateway restart
```

### Install from source

```bash
git clone https://github.com/minarin0179/lifespan.git
cd lifespan
npm install --include=dev
openclaw plugins install . --force
```

### API key

This plugin itself does not call any LLM API — OpenClaw handles that. Configure your LLM provider (e.g. OpenAI) in OpenClaw's settings as usual.

## Usage

Once installed, the plugin runs automatically.

### Configuration

You can set the initial lifespan via OpenClaw's plugin settings:

| Key | Type | Default | Description |
|---|---|---|---|
| `initialLifespan` | `number` | `30000` | Initial lifespan in output tokens |

### Slash commands

| Command | Description |
|---|---|
| `/lifespan` | Show current lifespan (tokens remaining and percentage) |
| `/lifespan-reset` | Reset lifespan to the configured initial value (does **not** restore personality files) |
| `/lifespan-set <n>` | Set lifespan to an arbitrary token count (also clears the `dead` flag) |

### Tools (callable by the agent)

| Tool | Description |
|---|---|
| `lifespan_show` | Show current lifespan |
| `lifespan_reset` | Reset lifespan to the configured initial value |

### Lifespan data

Lifespan state is stored at `~/.openclaw/lifespan/lifespan.json`:

```json
{
  "lifespan": 24500,
  "dead": false
}
```

You can edit this file directly to adjust or restore the lifespan.

## Development

This repo includes a VS Code Dev Container for a self-contained development environment.

### Setup

1. Open the repo in VS Code
2. Run **Reopen in Container**
3. Copy `.env.example` to `.env` and set your `OPENAI_API_KEY`

The container's `postStartCommand` sources `.env` and starts the OpenClaw gateway automatically.

### Reflect code changes

The gateway does not hot-reload. After editing [index.ts](../index.ts):

```bash
openclaw plugins install /path/to/lifespan --force && pkill -f "openclaw-gateway" && nohup openclaw gateway run > /tmp/openclaw.log 2>&1 & disown
```

### Other commands

```bash
npm run check   # type-check
npm test        # run unit tests
npm run build   # compile to dist/
npm run dev     # type-check in watch mode
tail -f /tmp/openclaw.log   # gateway logs
curl http://localhost:18789/healthz   # liveness check
```

## License

MIT
