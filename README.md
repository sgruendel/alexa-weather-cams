# alexa-weather-cams
Alexa Skill to view DWD weather webcams

## TODO
- Access previous images by specifying time and date
- When WeatherCamIntent receives multiple matches and starts slot elicitation, e.g.
  "Welche Kamera, Hamburg Südost oder Hamburg Südwest?", store matches in session. When user
  answers "Südwest", we can use "Hamburg Südwest", no need to elicit all "Südwest" webcams.
- When launching via "Alexa, öffne Wetterkamera" and answering webcam question with "Offenbach",
  it works as expected by asking for "Offenbach Ost oder Offenbach West" as it matches both slot
  values; but for answer "Hamburg" it doesn't recognice any slot value and keeps reprompting.
  As a workaround, synonym "Hamburg" is added to one of the slots. Raise a case with ASK team for that.
