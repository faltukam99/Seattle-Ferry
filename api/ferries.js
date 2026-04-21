export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const url = `https://wsdot.wa.gov/Ferries/API/Schedule/rest/terminaltoday/7?apiaccesscode=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.text(); // Get as text first to clean it
    
    // Clean that "Unexpected Token" (BOM) character
    const cleanData = data.replace(/^\uFEFF/, '').trim();
    
    res.setHeader('Access-Control-Allow-Origin', '*'); // Tell the browser it's safe
    res.status(200).send(cleanData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch WSDOT data' });
  }
}
