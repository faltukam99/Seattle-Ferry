export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';
  const today = new Date().toISOString().split('T')[0];

  try {
    // We use the 'terminalcombos' endpoint which returns the full day schedule
    const url = `https://www.wsdot.wa.gov/ferries/api/schedule/rest/terminalcombos/${today}/${tid}?apiaccesscode=${API_KEY}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    const rawText = await response.text();

    // If it's XML (starts with <), we parse it manually
    if (rawText.trim().startsWith('<')) {
      const combos = [];
      // Regex to find each TerminalComboDetail block
      const comboRegex = /<TerminalComboDetail>([\s\S]*?)<\/TerminalComboDetail>/g;
      let match;

      while ((match = comboRegex.exec(rawText)) !== null) {
        const block = match[1];
        const arrivingName = block.match(/<ArrivingDescription>(.*?)<\/ArrivingDescription>/)?.[1] || "Unknown";
        const departingId = block.match(/<DepartingTerminalID>(.*?)<\/DepartingTerminalID>/)?.[1] || tid;

        // Extract Times
        const times = [];
        const timeRegex = /<TerminalTime>([\s\S]*?)<\/TerminalTime>/g;
        let tMatch;
        while ((tMatch = timeRegex.exec(block)) !== null) {
          const tBlock = tMatch[1];
          times.push({
            DepartingTime: tBlock.match(/<DepartingTime>(.*?)<\/DepartingTime>/)?.[1],
            VesselName: tBlock.match(/<VesselName>(.*?)<\/VesselName>/)?.[1] || "TBA"
          });
        }

        combos.push({
          ArrivingDescription: arrivingName,
          DepartingTerminalID: departingId,
          Times: times
        });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ TerminalComboDetails: combos });
    }

    // If it's already JSON, just pass it through
    const jsonData = JSON.parse(rawText);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(jsonData.TerminalComboDetails ? jsonData : { TerminalComboDetails: jsonData });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
