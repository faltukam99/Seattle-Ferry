export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';

  // Aligned with WSDOT REST documentation:
  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday?terminalid=${tid}&apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // Documentation specifies these exact headers for data retrieval
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();

    // Check if the response is valid JSON
    try {
      const data = JSON.parse(text);
      
      // Add standard CORS headers for your frontend
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      
      return res.status(200).json(data);
    } catch (e) {
      // If parsing fails, we are likely still getting that help page or an error
      return res.status(200).json({ 
        error: "Legacy API Format Error", 
        message: "The server returned a non-JSON response.",
        raw_start: text.substring(0, 150) 
      });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
