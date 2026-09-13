# alexa-weather-cams

[![CI](https://github.com/sgruendel/alexa-weather-cams/actions/workflows/node.js.yaml/badge.svg?branch=master)](https://github.com/sgruendel/alexa-weather-cams/actions/workflows/node.js.yaml)
[![Node.js 24](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)](mise.toml)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)

Alexa skill for DWD weather cameras. Camera names and exact synonyms come from
`skill-package/interactionModels/custom/de-DE.json`, shared with Lambda through `lambda/de-DE.json`.
APL devices show an image, camera name, and DWD attribution; older Display devices use the existing
image template. Alexa app cards and voice-only responses are also supported.

Run `mise install` from the repository root to install Node 24, matching the Lambda runtime in `ask-resources.json`.
Then run the following commands from `lambda/`:

```bash
mise exec -- npm ci
mise exec -- npm run lint
mise exec -- npm test
```

| Command | Purpose |
| --- | --- |
| `npm test` | Offline unit and actual Lambda/ASK SDK integration tests with coverage |
| `npm run test:unit` | Camera resolution, navigation decisions, ASK runner, and offline isolation |
| `npm run test:integration` | Actual Lambda handler with synthetic Alexa requests |
| `npm run test:contract` | Live DWD image checks for every URL emitted in cards and screen directives |
| `npm run test:e2e` | Dialogs against the deployed Alexa development skill |
| `npm run lint` | ESLint |

GitHub Actions uses the same `mise.toml` configuration for offline CI and live image contracts, and caches npm downloads.
With Mise activated in your shell, you can also run the npm commands directly.

Offline suites preload a dummy skill ID before imports, do not load `.env`, and disable network
connections. Coverage includes all runtime modules and requires 90% lines, statements, and functions,
and 85% branches. Reports are written to `lambda/coverage/` and uploaded by PR CI.
Live image contracts run separately every Monday and through manual workflow dispatch. Each URL gets
one request, a 10-second deadline, HTTP/content-type checks, and a JPEG signature check.

For deployment and deployed tests, copy `lambda/.env.example` to `lambda/.env` and set `SKILL_ID`.
The deployed Lambda must provide the same environment variable. The local `.env` is ignored by Git.
Install the ASK CLI (`npm install -g ask-cli`) and run `ask configure` to authenticate the `default`
profile with the developer account that owns the skill. Set `ASK_PROFILE` when using another profile
for e2e tests. In the Alexa developer console, select the skill's **Test** tab and enable testing for
**Development**; enable the development skill for the same account in the Alexa app when testing devices.

Deployed tests validate the code, interaction model, and manifest already deployed to Alexa, not an
undeployed working tree. Deploy those changes only as a separately authorized step, including the
manifest's APL interface and supported viewports. Then run `npm run test:e2e`. Each replay has isolated
temporary input/output files, validates every completed turn, and allows at most two attempts for
incomplete simulation output or the known transient “An unexpected error occurred.” response.
Subprocesses are killed after 35 seconds per attempt, within an 80-second total budget and 90-second
Mocha timeout. A nonzero ASK exit is retried only when its saved output confirms that known transient
simulation error. Assertion failures, other skill errors, timeouts, and unrelated CLI failures are not retried.

The navigation replay requires a simulation that exposes a screen interface. It verifies that Alexa
keeps the same session open; a voice-only simulation cannot validate screen browsing and will fail
that check. Record this limitation if the available ASK simulator lacks screen support, and validate
the navigation dialog on an Echo Show. Concurrent runners isolate files, but separate accounts may
still be needed to avoid interference between remote Alexa sessions.

Before release, record the deployed revision and e2e results, then check a voice-only Echo and an Echo
Show for German pronunciation, image visibility and aspect ratio, DWD attribution, next/previous
navigation including wraparound, and stop/cancel behavior. With VoiceView enabled on the Echo Show,
verify that the image label announces the selected camera name and DWD attribution, including after navigation.
Voice-only selection and stop/cancel
explicitly end the session; successful screen responses leave `shouldEndSession` unset. Record any
unavailable external or device checks in the PR. Deployment packaging and historical-image navigation
remain separate follow-ups.

The APL manifest and document follow Amazon's
[viewport configuration](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-select-the-viewport-profiles-your-skill-supports.html)
and [APL interface](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-interface.html)
references.
