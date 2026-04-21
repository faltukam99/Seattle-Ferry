export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday/7?apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url);
    const xmlText = await response.text();

    // Clean text and check if it's JSON (just in case)
    const cleanXml = xmlText.replace(/^\uFEFF/, '').trim();
    if (cleanXml.startsWith('{')) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(cleanXml);
    }

    // Bulletproof Case-Insensitive Parsing
    const comboRegex = /<TerminalComboDetail>([\s\S]*?)<\/TerminalComboDetail>/gi;
    const timeRegex = /<TerminalTime>([\s\S]*?)<\/TerminalTime>/gi;
    
    let combos = [];
    let match;

    while ((match = comboRegex.exec(cleanXml)) !== null) {
      const comboContent = match[1];
      
      // Pull Route Info
      const arrivingName = comboContent.match(/<ArrivingDescription>(.*?)<\/ArrivingDescription>/i)?.[1] || "Unknown";
      const departingName = comboContent.match(/<DepartingTerminalName>(.*?)<\/DepartingTerminalName>/i)?.[1] || "";
      const departingId = parseInt(comboContent.match(/<DepartingTerminalID>(.*?)<\/DepartingTerminalID>/i)?.[1] || "0");

      // Pull Sailing Times
      let times = [];
      let tMatch;
      while ((tMatch = timeRegex.exec(comboContent)) !== null) {
        const tContent = tMatch[1];
        times.push({
          DepartingTime: tContent.match(/<DepartingTime>(.*?)<\/DepartingTime>/i)?.[1] || "",
          VesselName: tContent.match(/<VesselName>(.*?)<\/VesselName>/i)?.[1] || "Vessel TBA"
        });
      }

      combos.push({
        ArrivingDescription: arrivingName,
        DepartingTerminalName: departingName,
        DepartingTerminalID: departingId,
        Times: times
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Return the same structure index.html expects
    return res.status(200).json({ TerminalComboDetails: combos });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
