# Testing Weather Cams

Run `mise install` from the repository root to install Node 24, matching the Lambda runtime in `ask-resources.json`.
Run the commands below from `lambda/` after `npm ci`.
With Mise activated in your shell, run npm directly; otherwise prefix each command with `mise exec --`.

| Command | Purpose | External access |
| --- | --- | --- |
| `npm test` | Offline unit and actual Lambda/ASK SDK integration tests with coverage | None |
| `npm run test:unit` | Camera resolution, navigation decisions, ASK runner, and offline isolation | None |
| `npm run test:integration` | Actual Lambda handler with synthetic Alexa requests | None |
| `npm run test:contract` | Live DWD image checks for every URL emitted in cards and screen directives | DWD |
| `npm run test:e2e` | Dialogs against the deployed Alexa development skill | Alexa |
| `npm run lint` | ESLint | None |

## Offline tests and coverage

Offline suites preload a dummy skill ID before imports, do not load `.env`, and disable network
connections. Coverage includes all runtime modules and requires 90% lines, statements, and functions,
and 85% branches. Reports are written to `lambda/coverage/` and uploaded by PR CI.

GitHub Actions uses the same `mise.toml` configuration for offline CI and live image contracts, and caches npm downloads.

## Live DWD image contracts

Live image contracts run separately every Monday and through manual workflow dispatch. Each URL gets
one request, a 10-second deadline, HTTP/content-type checks, and a JPEG signature check.

Run `npm run test:contract` to check the URLs emitted in Alexa cards and screen directives against DWD.
This suite uses a dummy skill ID and needs network access to DWD, but no Alexa credentials or deployed skill.
It runs separately from ordinary PR tests so an upstream outage does not fail offline CI.

## Deployed Alexa dialogs

From `lambda/`, copy `.env.example` to `.env`, set `SKILL_ID`, and set `ASK_PROFILE` to a dedicated,
non-default ASK CLI test profile. The profile is required; the e2e runner never falls back to `default`,
so the default account can remain enabled for **Live** testing. In the Alexa developer console, enable
**Development** testing for the dedicated profile's account. Enable the development skill for that same
account in the Alexa app when testing devices.

The local `.env` is ignored by Git. Deployment uses the ASK CLI `default` profile; `ASK_PROFILE` is used
only by deployed-skill tests. The Lambda environment always requires `SKILL_ID`. It also requires
`IMAGE_PROXY_BASE_URL` to deliver camera images to physical APL devices.

Physical APL devices require external image responses to include a CORS header. The DWD image endpoint
does not include one, so configure a public Function URL for the Lambda with URL-only invocation permission.
Set `IMAGE_PROXY_BASE_URL` to the Function URL followed by `/image/`, then confirm that a known path such as
`Schmuecke-SW/816.jpg` returns `access-control-allow-origin: *`. Without this environment variable, the
skill falls back to the direct DWD URL for local and contract tests.

Deployed tests validate the code, interaction model, and manifest already deployed to Alexa, not an
undeployed working tree. A Lambda-only or interaction-model-only deployment does not enable APL. Deploy
the complete project from `lambda/` with `npm run skill:deploy` so that Alexa receives the manifest's APL
interface and supported viewports as well as the Lambda code. The deployment script initializes ASK CLI's
ignored `.ask/ask-states.json` from `SKILL_ID` and rejects a conflicting existing target. Then run
`npm run test:e2e`. Each replay has isolated
temporary input/output files, validates every completed turn, and allows at most two attempts for
incomplete simulation output or the known transient “An unexpected error occurred.” response.
Subprocesses are killed after 35 seconds per attempt, within an 80-second total budget and 90-second
Mocha timeout. A nonzero ASK exit is retried only when its saved output confirms that known transient
simulation error. Assertion failures, other skill errors, timeouts, and unrelated CLI failures are not retried.

The navigation replay requires a simulation that exposes the APL screen interface. It verifies that Alexa
keeps the same session open; a voice-only or legacy Display simulation cannot validate screen browsing and
will fail that check. Record this limitation if the available ASK simulator lacks APL support, and validate
the navigation dialog on an Echo Show. Concurrent runners isolate files, but separate accounts may
still be needed to avoid interference between remote Alexa sessions.

## Before release: device checks

Before release, record the deployed revision and e2e results, then check a voice-only Echo and an Echo
Show for German pronunciation, image visibility and aspect ratio, DWD attribution, next/previous
navigation including wraparound, and stop/cancel behavior. With VoiceView enabled on the Echo Show,
verify that the image label announces the selected camera name and DWD attribution, including after navigation.
Voice-only selection and stop/cancel explicitly end the session; successful screen responses leave
`shouldEndSession` unset. Record any unavailable external or device checks in the PR.
