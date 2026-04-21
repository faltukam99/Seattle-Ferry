export default async function handler(req, res) {
  // Use .trim() to ensure no accidental spaces/newlines break the URL
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d'.trim();
  const { terminalId } = req.query;
  const tid = terminalId || '7';
  const today = new Date().toISOString().split('T')[0];

  // 1. Build the URL strictly
  const baseUrl = `https://www.wsdot.wa.gov/ferries/api/schedule/rest/terminalcombos/${today}/${tid}`;
  const finalUrl = `${baseUrl}?apiaccesscode=${API_KEY}`;

  // 2. LOG THE URL (Check this in your Vercel Dashboard -> Logs)
  console.log("FETCHING FROM WSDOT:", finalUrl);

  try {
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache' 
      }
    });

    const text = await response.text();

    // Log the first 100 characters of the response to see if it's the Help Page
    console.log("WSDOT RESPONSE START:", text.substring(0, 100));

    // Manual XML Parser (if WSDOT ignores the JSON header)
    if (text.trim().startsWith('<')) {
      const combos = [];
      const blocks = text.match(/<TerminalComboDetail>[\s\S]*?<\/TerminalComboDetail>/g) || [];
      blocks.forEach(b => {
        combos.push({
          ArrivingDescription: b.match(/<ArrivingDescription>(.*?)<\/ArrivingDescription>/)?.[1],
          DepartingTerminalID: b.match(/<DepartingTerminalID>(.*?)<\/DepartingTerminalID>/)?.[1],
          Times: (b.match(/<TerminalTime>[\s\S]*?<\/TerminalTime>/g) || []).map(t => ({
            DepartingTime: t.match(/<DepartingTime>(.*?)<\/DepartingTime>/)?.[1],
            VesselName: t.match(/<VesselName>(.*?)<\/VesselName>/)?.[1] || "TBA"
          }))
        });
      });
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ TerminalComboDetails: combos });
    }

    const data = JSON.parse(text);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data.TerminalComboDetails ? data : { TerminalComboDetails: data });

  } catch (error) {
    console.error("PROXY_ERROR:", error.message);
    return res.status(500).json({ error: "Fetch failed", details: error.message });
  }
}
