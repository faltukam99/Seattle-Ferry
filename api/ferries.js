export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  // Attempt to fetch the schedule
  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday/7?apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const cleanText = text.replace(/^\uFEFF/, '').trim();

    // 1. If it's JSON, send it and we are done
    if (cleanText.startsWith('{')) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(cleanText);
    }

    // 2. If it's XML, use a very broad regex to find ANY sailing times
    // This regex looks for anything between <TerminalComboDetail> tags
    const comboMatches = cleanText.match(/<TerminalComboDetail>[\s\S]*?<\/TerminalComboDetail>/gi);

    if (!comboMatches) {
        // If no combos found, send the raw text back so we can debug it
        return res.status(200).json({ 
            debug: "No XML combos found", 
            rawStart: cleanText.substring(0, 200) 
        });
    }

    const combos = comboMatches.map(block => {
      const arriving = block.match(/<ArrivingDescription>(.*?)<\/ArrivingDescription>/i)?.[1] || "Unknown";
      const depId = block.match(/<DepartingTerminalID>(.*?)<\/DepartingTerminalID>/i)?.[1] || "0";
      
      const timeMatches = block.match(/<TerminalTime>[\s\S]*?<\/TerminalTime>/gi) || [];
      const times = timeMatches.map(t => ({
        DepartingTime: t.match(/<DepartingTime>(.*?)<\/DepartingTime>/i)?.[1] || "",
        VesselName: t.match(/<VesselName>(.*?)<\/VesselName>/i)?.[1] || "TBA"
      }));

      return {
        ArrivingDescription: arriving,
        DepartingTerminalID: parseInt(depId),
        Times: times
      };
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ TerminalComboDetails: combos });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
