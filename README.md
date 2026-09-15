# alexa-weather-cams

[![CI](https://github.com/sgruendel/alexa-weather-cams/actions/workflows/node.js.yaml/badge.svg?branch=master)](https://github.com/sgruendel/alexa-weather-cams/actions/workflows/node.js.yaml)
[![Node.js 24](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)](mise.toml)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)

Alexa skill for DWD weather cameras. Camera names and exact synonyms come from
`skill-package/interactionModels/custom/de-DE.json`, shared with Lambda through `lambda/de-DE.json`.
APL devices show an image, camera name, and DWD attribution. Alexa app cards and voice-only responses
are also supported.

Run `mise install` from the repository root to install Node 24, matching the Lambda runtime in `ask-resources.json`.
Then run the following commands from `lambda/`:

```bash
mise exec -- npm ci
mise exec -- npm run lint
mise exec -- npm test
```

See [TESTING.md](TESTING.md) for individual suites, coverage, CI, deployed Alexa setup, and device checks.

For deployment, copy `lambda/.env.example` to `lambda/.env` and set `SKILL_ID`.
The deployed Lambda must provide the same environment variable. The local `.env` is ignored by Git.
Run `mise exec -- npm run skill:deploy` from `lambda/` to deploy both the Lambda and skill manifest. Deploying only
the Lambda or interaction model does not enable the APL interface that an Echo Show needs to render
the camera image. The command initializes ASK CLI's ignored project state from `SKILL_ID` and refuses
to deploy if an existing state file targets a different skill.

The APL manifest and document follow Amazon's
[viewport configuration](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-select-the-viewport-profiles-your-skill-supports.html)
and [APL interface](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-interface.html)
references.

Deployment packaging and historical-image navigation remain separate follow-ups.
