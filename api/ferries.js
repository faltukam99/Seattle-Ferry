export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  
  // Get terminalId from the URL query (e.g., /api/ferries?terminalId=3)
  const { terminalId } = req.query;
  const tid = terminalId || '7'; // Default to Seattle (7)

  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday/${tid}?apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const cleanXml = text.replace(/^\uFEFF/, '').trim();

    // Set headers for the browser
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 1. Handle JSON response (if WSDOT cooperates)
    if (cleanXml.startsWith('{')) {
      return res.status(200).send(cleanXml);
    }

    // 2. Handle XML response (Manual Parser)
    const comboRegex = /<TerminalComboDetail>([\s\S]*?)<\/TerminalComboDetail>/gi;
    const timeRegex = /<TerminalTime>([\s\S]*?)<\/TerminalTime>/gi;
    
    let combos = [];
    let match;

    while ((match = comboRegex.exec(cleanXml)) !== null) {
      const block = match[1];
      
      const arriving = block.match(/<ArrivingDescription>(.*?)<\/ArrivingDescription>/i)?.[1] || "Unknown";
      const depName = block.match(/<DepartingTerminalName>(.*?)<\/DepartingTerminalName>/i)?.[1] || "";
      const depId = block.match(/<DepartingTerminalID>(.*?)<\/DepartingTerminalID>/i)?.[1] || tid;

      let times = [];
      let tMatch;
      while ((tMatch = timeRegex.exec(block)) !== null) {
        const tContent = tMatch[1];
        times.push({
          DepartingTime: tContent.match(/<DepartingTime>(.*?)<\/DepartingTime>/i)?.[1] || "",
          VesselName: tContent.match(/<VesselName>(.*?)<\/VesselName>/i)?.[1] || "Vessel TBA"
        });
      }

      combos.push({
        ArrivingDescription: arriving,
        DepartingTerminalName: depName,
        DepartingTerminalID: parseInt(depId),
        Times: times
      });
    }

    return res.status(200).json({ TerminalComboDetails: combos });

  } catch (error) {
    return res.status(500).json({ error: "Server Error", message: error.message });
  }
}
