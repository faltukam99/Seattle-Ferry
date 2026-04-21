// api/ferries.js
export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday/7?apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json' // <--- THIS IS THE KEY CHANGE
      }
    });

    const text = await response.text();
    
    // Scrub the Byte Order Mark (BOM)
    const cleanData = text.replace(/^\uFEFF/, '').trim();
    
    // Check if it's STILL XML (Safety net)
    if (cleanData.startsWith('<?xml')) {
        throw new Error('Server insisted on sending XML');
    }

    // Set the response headers for your browser
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).send(cleanData);
    
  } catch (error) {
    console.error("API Error:", error.message);
    return res.status(500).json({ error: 'Failed to fetch', message: error.message });
  }
}
