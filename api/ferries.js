export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';

  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday/${tid}?apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const cleanXml = text.replace(/^\uFEFF/, '').trim();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (cleanXml.startsWith('{')) return res.status(200).send(cleanXml);

    // This regex is "Namespace Blind" - it looks for the tag name regardless of what's before it
    const comboRegex = /<[^>]*?TerminalComboDetail>([\s\S]*?)<\/[^>]*?TerminalComboDetail>/gi;
    const timeRegex = /<[^>]*?TerminalTime>([\s\S]*?)<\/[^>]*?TerminalTime>/gi;
    
    let combos = [];
    let match;

    while ((match = comboRegex.exec(cleanXml)) !== null) {
      const block = match[1];
      
      // Look for tags that might have "a:" or "v1:" prefixes
      const arriving = block.match(/<[^>]*?ArrivingDescription>(.*?)<\/[^>]*?ArrivingDescription>/i)?.[1] || "Unknown";
      const depId = block.match(/<[^>]*?DepartingTerminalID>(.*?)<\/[^>]*?DepartingTerminalID>/i)?.[1] || tid;
      const depName = block.match(/<[^>]*?DepartingTerminalName>(.*?)<\/[^>]*?DepartingTerminalName>/i)?.[1] || "";

      let times = [];
      let tMatch;
      while ((tMatch = timeRegex.exec(block)) !== null) {
        const tContent = tMatch[1];
        times.push({
          DepartingTime: tContent.match(/<[^>]*?DepartingTime>(.*?)<\/[^>]*?DepartingTime>/i)?.[1] || "",
          VesselName: tContent.match(/<[^>]*?VesselName>(.*?)<\/[^>]*?VesselName>/i)?.[1] || "Vessel TBA"
        });
      }

      combos.push({
        ArrivingDescription: arriving,
        DepartingTerminalName: depName,
        DepartingTerminalID: parseInt(depId),
        Times: times
      });
    }

    // If we still found nothing, send a debug field so we can see the XML structure
    if (combos.length === 0) {
        return res.status(200).json({ 
            TerminalComboDetails: [], 
            debug_raw: cleanXml.substring(0, 500) 
        });
    }

    return res.status(200).json({ TerminalComboDetails: combos });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
