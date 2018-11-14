# alexa-weather-cams
Alexa Skill to view DWD weather webcams

## TODO
- Handle built-in intents for DisplayInterface like NavigateHome, More, Next ...
- Access previous images by specifying time and date
- When WeatherCamIntent receives multiple matches and starts slot elicitation, e.g.
  "Welche Kamera, Hamburg Südost oder Hamburg Südwest?", store matches in session. When user
  answers "Südwest", we can use "Hamburg Südwest", no need to elicit all "Südwest" webcams.
