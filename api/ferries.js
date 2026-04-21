export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';
  const today = new Date().toISOString().split('T')[0];

  // Try the most 'formal' version of the WCF REST URL
  const url = `https://www.wsdot.wa.gov/ferries/api/schedule/rest/terminalcombos/${today}/${tid}/json?apiaccesscode=${API_KEY}`;

  console.log("SENDING REQUEST TO:", url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const text = await response.text();
    console.log("RAW RESPONSE PREVIEW:", text.substring(0, 100));

    // If we are still getting HTML, it means the REST endpoint is failing.
    // Let's try the 'routes' endpoint as a fallback within the same function.
    if (text.includes('<!DOCTYPE html')) {
       console.log("REST failed, attempting fallback to routes endpoint...");
       const fallbackUrl = `https://www.wsdot.wa.gov/ferries/api/schedule/rest/routes/${today}/${tid}/3?apiaccesscode=${API_KEY}`;
       const fallbackRes = await fetch(fallbackUrl);
       const fallbackText = await fallbackRes.text();
       
       // If this works, parse it and return
       try {
           const data = JSON.parse(fallbackText);
           return res.status(200).json({ TerminalComboDetails: data });
       } catch (e) {
           return res.status(200).json({ error: "WSDOT Firewall Block", details: "Server is returning HTML only." });
       }
    }

    const data = JSON.parse(text);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
