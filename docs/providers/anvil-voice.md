---
summary: "Use Anvil Voice as a gateway-relay realtime speech-to-speech provider"
read_when:
  - You want OpenClaw Talk or Voice Call to speak through Anvil Voice
  - You are routing speech-to-speech turns to a local fast-tier LLM
  - You need a backend-only realtime voice provider instead of browser WebRTC
title: "Anvil Voice"
---

Anvil Voice is a bundled realtime voice provider for OpenClaw. It connects
OpenClaw Talk or Voice Call to an Anvil `/v1/realtime` WebSocket so speech
turns can reach a local or private fast-tier LLM and return streamed audio.

- Provider id: `anvil`
- Transport: `gateway-relay`
- Default model: `fast-local`
- Audio: Browser Talk PCM16 24 kHz or Voice Call G.711 mu-law 8 kHz, adapted to Anvil Voice PCM16 16 kHz
- Auth: optional on loopback; bearer token or SecretRef for remote endpoints

Use this provider when the Gateway should own the vendor/private socket and
the browser, phone bridge, or mobile app should only stream microphone audio
to the Gateway. For OpenAI browser WebRTC use the `openai` provider instead.
For Google Live browser WebSocket sessions use the `google` provider. For
streaming transcription-only call audio, use a realtime transcription
provider such as `elevenlabs`, `openai`, `deepgram`, `mistral`, or `xai`.

## Capabilities

| Capability             | Supported                                      |
| ---------------------- | ---------------------------------------------- |
| Browser Talk           | Yes, through Gateway relay                     |
| Voice Call realtime    | Yes, through Gateway relay                     |
| Browser-direct WebRTC  | No                                             |
| Provider browser token | No                                             |
| Tool calls             | Yes, via OpenClaw realtime function-call relay |
| Barge-in               | Yes                                            |
| Default consult route  | `force-agent-consult`                          |

## Control UI Talk

Same-host Anvil Voice does not need a token when the Anvil realtime server is
bound to loopback:

```json5
{
  talk: {
    realtime: {
      mode: "realtime",
      transport: "gateway-relay",
      brain: "agent-consult",
      provider: "anvil",
      consultRouting: "force-agent-consult",
      instructions: "Speak briefly. Call openclaw_agent_consult for tools, memory, current facts, or workspace context.",
      providers: {
        anvil: {
          realtimeUrl: "ws://127.0.0.1:8765/v1/realtime",
          model: "fast-local",
        },
      },
    },
  },
}
```

For a remote or tailnet Anvil Voice endpoint, use TLS or a private trusted
network address and configure a bearer token through a SecretRef:

```json5
{
  talk: {
    realtime: {
      mode: "realtime",
      transport: "gateway-relay",
      brain: "agent-consult",
      provider: "anvil",
      consultRouting: "force-agent-consult",
      providers: {
        anvil: {
          baseUrl: "https://anvil-voice.example.com",
          apiKey: { source: "env", provider: "default", id: "ANVIL_VOICE_REALTIME_TOKEN" },
          model: "fast-local",
          speakerVoice: "default",
          silenceDurationMs: 200,
          vadThreshold: 0.5,
        },
      },
    },
  },
}
```

`baseUrl` accepts `http://`, `https://`, `ws://`, or `wss://`; OpenClaw appends
`/v1/realtime` when needed. Plain `ws://` is accepted only for loopback,
private, `.local`, or `.ts.net` hosts. Public endpoints should use `wss://`.

## Voice Call

Voice Call uses the same provider id under
`plugins.entries.voice-call.config.realtime`:

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          inboundPolicy: "allowlist",
          allowFrom: ["+15550005678"],
          realtime: {
            enabled: true,
            provider: "anvil",
            instructions: "Keep spoken answers concise.",
            providers: {
              anvil: {
                realtimeUrl: "ws://127.0.0.1:8765/v1/realtime",
                model: "fast-local",
                silenceDurationMs: 200,
              },
            },
          },
        },
      },
    },
  },
}
```

For cross-machine calls, put `apiKey` under
`plugins.entries.voice-call.config.realtime.providers.anvil.apiKey` and store
it as a SecretRef or environment-backed value. Do not put bearer tokens in
committed config files.

## Settings

| Setting           | Config path                                                                       | Default               |
| ----------------- | --------------------------------------------------------------------------------- | --------------------- |
| Realtime URL      | `talk.realtime.providers.anvil.realtimeUrl` / `...voice-call...anvil.realtimeUrl` | -                     |
| Base URL          | `...anvil.baseUrl`                                                                | -                     |
| API key           | `...anvil.apiKey` or `...anvil.token`                                             | optional              |
| Model             | `...anvil.model`                                                                  | `fast-local`          |
| Voice             | `...anvil.speakerVoice` or `...anvil.voice`                                       | Anvil default         |
| VAD threshold     | `...anvil.vadThreshold`                                                           | `0.5`                 |
| Silence duration  | `...anvil.silenceDurationMs`                                                      | `200`                 |
| Prefix padding    | `...anvil.prefixPaddingMs`                                                        | `0`                   |
| Consult routing   | `talk.realtime.consultRouting`                                                    | `force-agent-consult` |
| Consult model     | `talk.consultModel`                                                               | unset                 |
| Bootstrap context | `talk.consultBootstrapContextMode`                                                | `lightweight`         |

## Operational notes

- The Anvil Voice server owns STT, fast-tier LLM routing, and TTS.
- When Talk exposes `openclaw_agent_consult`, OpenClaw forwards the tool
  descriptor to Anvil in `session.update`. Anvil can call it during a voice
  response through standard Realtime function-call item events, OpenClaw runs
  the normal agent/tool-backed consult, and the result is submitted back as a
  realtime `function_call_output`.
- Talk defaults Anvil to `consultRouting: "force-agent-consult"` so final
  transcripts still enter the active OpenClaw chat session when the realtime
  provider answers directly instead of calling `openclaw_agent_consult`. Set
  `talk.realtime.consultRouting: "provider-direct"` only when direct realtime
  replies are preferred over chat-session and tool continuity.
- For lower LLM latency, set `talk.consultModel` to a fast model ref such as
  `anvil/chat-fast`. It applies only to the hidden Talk consult run and does
  not change the visible chat session's selected model.
- Talk consults default to `talk.consultBootstrapContextMode: "lightweight"`
  so large workspace bootstrap files are not injected into every spoken turn.
  Set it to `"full"` only when voice turns need the normal agent bootstrap
  context and the added latency is acceptable.
- For lower latency, set `talk.consultToolsAllow` to the small tool set voice
  turns need, for example:
  `["read", "exec", "memory_search", "memory_get", "web_search", "web_fetch"]`.
  Narrow allowlists make OpenClaw use its minimal prompt path for embedded Talk
  consults instead of the full agent tool inventory. Restrictive runtime
  allowlists require an embedded runtime; ACP or CLI-backed sessions fail closed
  if the allowlist cannot be enforced.
- Anvil Voice keeps its own bounded same-session voice memory on the Anvil
  side. Restart the Anvil realtime server after changing that manifest so the
  gateway relay uses the new memory/tool settings.
- OpenClaw sends one `session.update` on connect, adapts browser PCM or phone
  mu-law audio into Anvil PCM16 16 kHz, commits after sustained silence, and
  forwards Anvil `response.output_audio.delta` events to the client.
- `response.cancel` is sent for barge-in. OpenClaw clears client playback and
  suppresses late audio deltas from the cancelled response.
- The Gateway keeps the Anvil bearer token server-side; browsers and mobile
  clients do not receive it.

## Anvil Serving handoff

OpenClaw only owns provider selection and audio relay for this integration.
Anvil Serving owns the Realtime server, STT/TTS lifecycle, fast-tier LLM route,
benchmarking, and the config-rendering workflow. Use the Anvil Serving
`docs/OPENCLAW-ANVIL-VOICE.md` guide as the operator runbook.

Typical Anvil Serving sequence:

```bash
anvil-serving voice up --config examples/voice/openclaw-anvil-voice.toml --dry-run
anvil-serving voice up --config examples/voice/openclaw-anvil-voice.toml
anvil-serving voice run --config examples/voice/openclaw-anvil-voice.toml
```

Render the OpenClaw provider block from the Anvil Serving router config instead
of hand-editing provider JSON when possible:

```bash
anvil-serving harness sync openclaw \
  --config configs/example.toml \
  --base-url http://127.0.0.1:8000/v1 \
  --voice \
  --voice-realtime-url ws://127.0.0.1:8765/v1/realtime \
  --out ./openclaw.anvil.json
```

For non-loopback Realtime endpoints, the SecretRef env var in OpenClaw should
match the Anvil Serving voice manifest's `voice.realtime_token_env`; it is
separate from the router token used by `[voice.llm].api_key_env`.

## Related

- [Talk mode](/nodes/talk)
- [Voice Call](/plugins/voice-call)
- [Control UI](/web/control-ui)
