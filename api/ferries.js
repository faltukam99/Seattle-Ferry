export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';

  // STRUCTURE: .../terminaltoday?terminalid={ID}&apiaccesscode={KEY}
  // No slashes after 'terminaltoday'
  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday?terminalid=${tid}&apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const text = await response.text();

    // Check if we are still getting HTML
    if (text.includes('<html')) {
        return res.status(200).json({ 
            error: "WSDOT Help Page Triggered", 
            message: "The server is still refusing the endpoint. Check terminal ID or Key.",
            attempted_url: url
        });
    }

    try {
      const data = JSON.parse(text);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(data);
    } catch (e) {
      return res.status(200).json({ 
        error: "Parse Error", 
        raw_data: text.substring(0, 100) 
      });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
