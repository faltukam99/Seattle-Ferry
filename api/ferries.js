// api/ferries.js
export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday/7?apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url);
    const xmlText = await response.text();

    // If it's already JSON (unlikely given your logs), just send it
    if (xmlText.trim().startsWith('{')) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(xmlText);
    }

    // Manual XML Parsing Logic for WSDOT structure
    // We are looking for TerminalComboDetails and their nested Times
    const terminalCombos = xmlText.split('<TerminalComboDetail>');
    terminalCombos.shift(); // Remove the header part

    const processedData = {
      TerminalComboDetails: terminalCombos.map(combo => {
        const arrivingDescription = combo.match(/<ArrivingDescription>(.*?)<\/ArrivingDescription>/)?.[1] || "";
        const departingTerminalID = parseInt(combo.match(/<DepartingTerminalID>(.*?)<\/DepartingTerminalID>/)?.[1] || "0");
        
        const timesMatch = combo.split('<TerminalTime>');
        timesMatch.shift();

        const times = timesMatch.map(t => ({
          DepartingTime: t.match(/<DepartingTime>(.*?)<\/DepartingTime>/)?.[1] || "",
          VesselName: t.match(/<VesselName>(.*?)<\/VesselName>/)?.[1] || "Vessel TBA"
        }));

        return {
          ArrivingDescription: arrivingDescription,
          DepartingTerminalID: departingTerminalID,
          Times: times
        };
      })
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(processedData);

  } catch (error) {
    console.error("Manual Parse Error:", error.message);
    return res.status(500).json({ error: 'Failed to parse WSDOT XML', details: error.message });
  }
}
