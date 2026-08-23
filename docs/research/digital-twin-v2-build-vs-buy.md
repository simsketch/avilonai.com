# Digital Twin v2.0 — Build vs. Buy Research Spike

**Status:** Draft for stakeholder review
**Author:** Research spike (agent-assisted), prepared 2026-08-23
**Scope:** Evaluate options for the foundation layer of "digital twin" v2.0 — the
photorealistic, voice-cloned avatar that lets a user rehearse a difficult
conversation with an AI recreation of someone in their life (partner, parent,
boss, etc.).

> **Source-access note:** This spike was produced without live internet access
> (outbound network calls were blocked in the research environment). Every
> claim below is either (a) attributed to a file/commit in this repository, or
> (b) explicitly marked **[ASSUMPTION — needs verification]** where it relies
> on general, possibly stale, product knowledge about third-party vendors.
> Before any build/buy decision is finalized, item (b) claims must be checked
> against the vendors' current public docs and pricing pages.

---

## 1. What "v2.0" is replacing — current state of the product (v1)

Avilon's product is **not** a text therapy bot per the original README — the
live homepage copy describes a *conversation-rehearsal* product: "Create a
digital twin of your partner, parent, boss, or anyone you need to have a
difficult conversation with" (source: `app/page.tsx:68`, `app/how-it-works/page.tsx:69`).
Pricing framing already exists in the UI copy: free tier = 5 sessions/month
with one digital twin, paid tier = unlimited sessions + multiple twins
(source: `app/how-it-works/page.tsx:432-436`).

The repository's own git history shows the team has **already run a build-vs-buy
experiment once**, in the following order:

| Date (commit) | Change | Path taken |
|---|---|---|
| 2025-12-18, `6b38434` | "Add Tavus video chat integration with custom Elon replica" | **Buy** — Tavus Conversational Video Interface (persona + replica + conversation API) |
| 2025-12-19–2026-01, `324619c`, `039b32e` | Persona/context fixes to keep Tavus working | Buy (iterating) |
| 2026-01-21, `9b2117f` | "Add dual video mode: Tavus real-time + Custom Avatar pipeline" — UI copy: *"Quick Session (Tavus): Real-time, <2s latency"* vs *"Custom Avatar: User's own avatar with SadTalker/Fish Audio"* | **Buy + Build side-by-side** |
| Later commits (`bc30733` "Fix null check on Simli config", and current `lib/pipecat/`, `pipecat-service/`) | Self-hosted Pipecat pipeline: Daily.co (WebRTC) + Deepgram (STT) + OpenAI LLM + Cartesia (TTS) + Simli (photoreal face rendering) | **Build** (orchestration) on top of bought components |
| Current `.env.example` | `TAVUS_API_KEY` is commented `# Optional: Tavus (legacy integration)` | Tavus demoted to legacy/optional |

This is directly relevant prior internal evidence: the team already piloted a
turnkey "buy" vendor (Tavus) and then invested engineering effort in a
self-hosted orchestration layer instead. There is no written decision record
(ADR) in the repo explaining *why* — this is a gap called out in §5.

### 1.1 Current architecture inventory (source of truth: this repo)

| Capability | Current provider | Buy/Build | Evidence |
|---|---|---|---|
| Real-time orchestration | Pipecat (open-source framework), self-hosted in `pipecat-service/` | Build (glue) | `pipecat-service/bot.py`, `pipecat-service/requirements.txt` |
| WebRTC transport | Daily.co | Buy | `pipecat-service/bot.py` imports `DailyTransport`; `@daily-co/daily-js` in `package.json` |
| Speech-to-text | Deepgram | Buy | `lib/avatar/stt.ts`, `pipecat-service/requirements.txt` |
| Text-to-speech (real-time path) | Cartesia | Buy | `pipecat-service/bot.py` imports `CartesiaTTSService` |
| Voice cloning (async path) | Fish Audio | Buy | `lib/avatar/voice-clone.ts`, `.env.example` |
| Lip sync (async path) | Replicate — SadTalker model | Buy (hosted inference) | `lib/avatar/lip-sync.ts`, `.env.example` |
| Photoreal avatar rendering (real-time path) | Simli | Buy | `lib/pipecat/client.ts` (`AvatarType = "simli" \| "sprite" \| "rpm"`), `simli-client` in `package.json` |
| LLM | OpenRouter (`deepseek/deepseek-r1-distill-llama-70b`, $0.27/1M tokens) | Buy | `README.md:21`, `DEPLOYMENT.md:134` |
| All-in-one conversational video (legacy) | Tavus | Buy | `lib/tavus/client.ts`, `.env.example` (marked legacy) |

**Observation:** the current "v1" is already a *hybrid* — there is no fully
proprietary in-house model anywhere in the stack today. "Build" in this repo
has so far meant "build the orchestration/pipeline and own the data model,"
not "build the underlying AI models." Any "build proprietary" option for v2.0
should be read as an extension of that pattern, or as a further step toward
owning more of the model stack (see Option B in §2).

---

## 2. Candidate approaches considered

### Option A — Build: extend the current hybrid pipeline (Pipecat + best-of-breed APIs)
Keep self-hosting the orchestration (`pipecat-service`) and the data layer
(Supabase `avatar_profiles`, `chat_sessions` — source: `lib/db/migrations/add_avatar_profiles.sql`,
`add_video_session_support.sql`), while continuing to buy the hard AI
sub-problems (STT, TTS, lip-sync/rendering) from specialist vendors (Deepgram,
Cartesia, Simli, Replicate/Fish Audio). This is what v1 already does.

- Pros (repo evidence): decoupled provider abstraction already exists
  (`AvatarType` union in `lib/pipecat/client.ts`, separate `lib/avatar` module),
  so swapping a vendor is a smaller blast radius than a monolithic vendor
  integration; UI copy already advertises "sub-second latency"
  (`components/chat/pipecat-video-interface.tsx:736`).
- Cons: more integration surface area to maintain (5+ vendor SDKs/APIs across
  two runtimes — Next.js and a separate Python `pipecat-service`); the team
  runs and pays for a persistent Python service instead of a single vendor
  call.

### Option B — Build: fully proprietary in-house model stack
Replace hosted STT/TTS/lip-sync with self-hosted open-source models (e.g.
Whisper for STT, an open TTS/voice-clone model such as Coqui XTTS, and an
open lip-sync/talking-head model such as SadTalker/Wav2Lip/MuseTalk) running
on owned or rented GPUs, with no dependency on Deepgram/Cartesia/Fish
Audio/Replicate/Simli.

- Pros: maximum data ownership (biometric voice/face data of a *third party*
  never leaves owned infra — relevant given this product's likeness-of-others
  use case, see §4), no per-minute vendor fees at scale, no vendor lock-in.
- Cons: **[ASSUMPTION — needs verification]** this requires GPU
  infrastructure and ML/infra hiring that nothing in this repo indicates the
  team currently has (no GPU/inference infra, Dockerfiles, or model-hosting
  config exist outside the lightweight `pipecat-service` Dockerfile, which
  itself calls out to Daily/Deepgram/Cartesia/Simli rather than hosting
  models). Building and operating real-time-quality lip-sync + voice clone
  in-house is a multi-quarter, GPU-cost-heavy undertaking; there is no
  internal cost/timeline estimate for this in the repo today.

### Option C — Buy: Tavus (Conversational Video Interface) as sole foundation
Revert to a Tavus-first architecture: replica (face) + persona (LLM/prompt) +
conversation (real-time video call), as already implemented once in
`lib/tavus/client.ts` and `app/api/tavus/*` (per commit `6b38434`).

- Pros (repo evidence): fastest to stand up — this was the *first* video
  feature shipped (Dec 2025) and the team's own UI copy described it as
  "Real-time, <2s latency" (commit `9b2117f` diff of `chat-interface.tsx`).
  Single vendor bill instead of five.
- Cons: the team subsequently marked `TAVUS_API_KEY` as "legacy" in
  `.env.example` and put engineering effort into the Pipecat/Simli pipeline
  instead — a directional signal that Tavus alone was insufficient for this
  product (possibly cost at scale, customization limits per-twin, or
  consent/ToS friction around cloning a non-account-holder's likeness —
  **[ASSUMPTION — the actual reason is not documented anywhere in-repo and
  should be confirmed with whoever made that call]**).
- Current Tavus pricing, replica-creation limits, and ToS terms for cloning a
  third party (not the account holder) are **[ASSUMPTION — needs
  verification against tavus.io's current docs/pricing page]**, since this
  spike had no live web access.

### Option D — Buy: expand use of Simli's hosted conversation API (not just rendering)
Simli is already the rendering component of Option A. A narrower "buy" move
is to let Simli (or a similar avatar-API vendor) also own more of the
real-time orchestration/session management, shrinking what `pipecat-service`
has to do.

- Pros: reduces the amount of custom Python service the team operates.
- Cons: current Simli usage is already a dependency (`simli-client` in
  `package.json`, `bc30733` fix commit); this option mainly trades "own the
  orchestration" for "vendor owns the orchestration," it does not remove a
  vendor, since Simli is already in the stack.
- Simli's hosted-conversation product scope and pricing are
  **[ASSUMPTION — needs verification against simli.com's current docs]**.

### Option E — Buy: other Tavus-style vendors (HeyGen Interactive Avatar, D-ID Agents, Synthesia)
Named in the task brief as vendors worth considering alongside Tavus. No file
in this repo references these vendors, and this spike had no web access to
pull their current docs/pricing.

- Status: **[ASSUMPTION — not evaluated in depth]**. Flagged as a candidate
  for a follow-up spike with live web access rather than presented with any
  cost/latency numbers here, since doing so without a citable source would
  violate the "no unverified facts" requirement for this document.

---

## 3. Comparison criteria

| Criterion | Why it matters here |
|---|---|
| Cost (build + per-minute/session at scale) | README/DEPLOYMENT already track LLM cost ($0.27/1M tokens, ~$5–10/mo at POC volume — source: `README.md:101-105`, `DEPLOYMENT.md:133-135`); no equivalent per-minute cost tracking exists yet for STT/TTS/rendering/Tavus, which is a gap (see §5). |
| Latency / real-time feel | The product's value proposition is a live, believable conversation. UI copy already asserts sub-second (Pipecat/Simli path, `pipecat-video-interface.tsx:736`) vs "<2s" (Tavus path, `chat-interface.tsx:455`) — both are self-reported, not independently benchmarked in-repo. |
| Consent / data ownership / biometric privacy | **Unique risk for this product**: the "twin" is a likeness of a *third party who is not the account holder and has not necessarily consented* (partner, boss, parent). This is materially different from typical avatar-vendor use cases (cloning yourself, or a licensed spokesperson) and needs explicit legal review regardless of build/buy (see §4). |
| Integration effort / time-to-market | Tavus shipped fastest historically (single vendor, `6b38434`); the current hybrid pipeline required a separate Python service, Daily.co transport, and multiple SDKs. |
| Licensing / vendor ToS | Whether a vendor's terms even permit cloning a non-consenting third party's face/voice is unknown and vendor-specific — **[ASSUMPTION — needs verification per vendor]**. |
| Vendor lock-in / portability | The existing `lib/avatar` / `lib/pipecat` / `lib/tavus` module boundaries already provide some provider abstraction, which lowers switching cost regardless of which option is chosen. |
| Reliability / operational burden | Self-hosted `pipecat-service` is another service to deploy, monitor, and scale (it is not currently covered in `DEPLOYMENT.md`, which only documents the Vercel/Supabase/OpenRouter path). |

---

## 4. Consent and likeness risk (applies to every option)

Because the product's core mechanic is generating a synthetic voice and face
of someone *other than the paying user* (source: `app/page.tsx:68`, "Create a
digital twin of your partner, parent, boss, or anyone you need"), every
option above inherits a legal/ethical question that is independent of
build-vs-buy: does the team have — or need — the depicted person's consent,
and do biometric-privacy statutes (e.g., BIPA-style laws) or a given vendor's
ToS block this use case? This is **[ASSUMPTION — not resolved anywhere in
this repo]** and should gate any v2.0 investment, not just the technical
choice.

---

## 5. Gaps identified during this spike

- No cost telemetry exists in-repo for the current Simli/Daily/Deepgram/
  Cartesia/Replicate/Fish Audio usage — only LLM cost is tracked
  (`README.md`, `DEPLOYMENT.md`). A build-vs-buy cost comparison at target
  scale cannot be made precisely without this data.
- No written decision record explains why Tavus was demoted from primary to
  "legacy" after `9b2117f` — worth a five-minute conversation with whoever
  made that call before repeating or reversing it.
- No legal/compliance review of third-party likeness cloning exists in-repo.
- This spike had no live internet access, so no vendor pricing/docs
  (Tavus, Simli, HeyGen, D-ID, Synthesia, Cartesia, Deepgram, Replicate,
  Fish Audio) could be freshly verified; all such facts above are flagged as
  assumptions rather than stated as facts, per the task's requirement.

---

## 6. Recommendation

**Recommendation: continue and formalize Option A (the current hybrid — own
the orchestration and data model, buy specialist STT/TTS/rendering
components) for v2.0, rather than reverting to a single turnkey vendor
(Option C/D/E) or committing to a fully proprietary model stack (Option B) at
this time.**

Rationale:
1. The team has already run this exact experiment (Tavus-first, then
   hybrid) and the hybrid path is what is actively maintained today — the
   most recent commits touching this area are Simli/Pipecat fixes, not
   Tavus fixes. Reversing that without knowing the original reason risks
   repeating a decision the team already moved away from.
2. Option B (fully proprietary models) is not justified by anything in this
   repo today — there is no GPU infra, ML hiring, or cost/timeline estimate
   to support it, and it would be the largest, slowest, most expensive path.
   It should be revisited only if per-minute vendor costs at scale are shown
   to exceed the cost of owned infrastructure (see "what needs to be true,"
   below).
3. Options C/D/E (single-vendor buy) would reduce integration surface area,
   which is a real advantage, but the team already tried the closest of
   these (Tavus) and deprioritized it; adopting a *different* single vendor
   (HeyGen/D-ID) with zero internal pilot data would be a bigger bet than
   extending what is already running.

### What would need to be true to proceed to a build/integration phase

- **Data:** actual per-minute/per-session cost and latency telemetry for the
  current Simli/Daily/Deepgram/Cartesia path (not currently instrumented),
  plus session-volume projections, so a real cost curve — not self-reported
  vendor claims — can be compared against Tavus/HeyGen/D-ID list pricing.
- **Legal:** a written opinion on consent/biometric-privacy requirements for
  cloning a non-account-holder's likeness, and confirmation that whichever
  vendor(s) are used permit this use case in their ToS.
- **Budget/timeline:** if the data above shows vendor costs will exceed a
  defined threshold at projected scale, a budgeted, multi-quarter plan
  (GPU spend + ML/infra hiring) would be required before Option B becomes
  viable — nothing in the current repo/budget suggests that threshold has
  been reached.
- **Decision record:** a short written note (even a paragraph) from whoever
  decided to deprioritize Tavus, so this spike's "why" gap in §5 doesn't
  recur for the next person revisiting this choice.
