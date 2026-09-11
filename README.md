# alexa-weather-cams
Alexa Skill to view DWD weather webcams

## Configuration

Commands are run from the `lambda/` directory. Copy `.env.example` to `.env` and set `SKILL_ID` to the Alexa skill
ID. The local file is ignored by Git.

GitHub Actions reads `SKILL_ID` from a repository variable. The deployed Lambda function must provide the same
variable in its environment configuration.

## Testing

Run commands from the `lambda/` directory:

```bash
npm test                 # local unit tests
npm run test:integration # dialog tests against the deployed Alexa development skill
```

## TODO
- Handle built-in intents for DisplayInterface like NavigateHome, More, Next ...
- Access previous images by specifying time and date
