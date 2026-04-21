export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';

  // Use the API endpoint that explicitly asks for JSON
  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday/${tid}?apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json', // <--- Tell WSDOT we want JSON, not HTML
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' // <--- "Identity"
      }
    });

    const data = await response.text();
    
    // Debugging: If it still sends HTML, we want to know
    if (data.includes('<!DOCTYPE html')) {
        return res.status(200).json({ 
            error: "WSDOT sent a webpage instead of data", 
            hint: "Check if the API Key is valid or if the terminal ID is correct.",
            raw: data.substring(0, 100)
        });
    }

    // Try to parse as JSON
    try {
        const jsonData = JSON.parse(data);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json(jsonData);
    } catch (parseError) {
        // Fallback to our XML parser if they sent XML despite our header
        // (Keep your previous XML regex logic here as a fallback)
        return res.status(200).json({ error: "Failed to parse JSON", raw: data.substring(0, 200) });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
