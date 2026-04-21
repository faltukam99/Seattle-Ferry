export default async function handler(req, res) {
  // Ensure there are NO spaces in this string
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';
  const today = new Date().toISOString().split('T')[0];

  // This is the specific URL structure that works with your key
  const url = `https://www.wsdot.wa.gov/ferries/api/schedule/rest/terminalcombos/${today}/${tid}?apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const text = await response.text();

    // IF WSDOT SENDS XML (starts with <)
    if (text.trim().startsWith('<')) {
      const combos = [];
      const comboBlocks = text.match(/<TerminalComboDetail>[\s\S]*?<\/TerminalComboDetail>/g) || [];

      comboBlocks.forEach(block => {
        const arriving = block.match(/<ArrivingDescription>(.*?)<\/ArrivingDescription>/)?.[1];
        const depId = block.match(/<DepartingTerminalID>(.*?)<\/DepartingTerminalID>/)?.[1];
        
        const timeBlocks = block.match(/<TerminalTime>[\s\S]*?<\/TerminalTime>/g) || [];
        const times = timeBlocks.map(t => ({
          DepartingTime: t.match(/<DepartingTime>(.*?)<\/DepartingTime>/)?.[1],
          VesselName: t.match(/<VesselName>(.*?)<\/VesselName>/)?.[1] || "TBA"
        }));

        combos.push({
          ArrivingDescription: arriving,
          DepartingTerminalID: depId,
          Times: times
        });
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ TerminalComboDetails: combos });
    }

    // IF WSDOT SENDS JSON
    const data = JSON.parse(text);
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Normalize response so it always has TerminalComboDetails
    const finalData = data.TerminalComboDetails ? data : { TerminalComboDetails: data };
    return res.status(200).json(finalData);

  } catch (error) {
    return res.status(500).json({ error: "Fetch failed", details: error.message });
  }
}
