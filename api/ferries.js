export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';

  // We are changing the URL from .../terminaltoday/${tid} 
  // to the query string version: .../terminaltoday?terminalid=${tid}
  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday?terminalid=${tid}&apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = await response.text();
    
    // Check if we hit another "Service" page
    if (data.includes('<html')) {
        return res.status(200).json({ 
            error: "Still hitting help page", 
            url_attempted: url,
            content: data.substring(0, 100) 
        });
    }

    try {
        const jsonData = JSON.parse(data);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json(jsonData);
    } catch (e) {
        return res.status(200).json({ error: "Data received but not JSON", raw: data });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
