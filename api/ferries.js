export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';
  const today = new Date().toISOString().split('T')[0];

  const matesUrl = `https://www.wsdot.wa.gov/ferries/api/schedule/rest/terminalmates/${today}/${tid}?apiaccesscode=${API_KEY}`;

  try {
    // 1. Get Destinations
    const mRes = await fetch(matesUrl, { headers: { 'Accept': 'application/json' } });
    const mText = await mRes.text();
    
    let mateIds = [];
    if (mText.trim().startsWith('<')) {
      mateIds = (mText.match(/<TerminalID>(\d+)<\/TerminalID>/g) || [])
                .map(m => m.replace(/<\/?TerminalID>/g, ''));
    } else {
      mateIds = JSON.parse(mText).map(m => m.TerminalID);
    }

    // 2. Fetch Sailings with Strict Headers
    const routeRequests = mateIds.map(async (destId) => {
      const url = `https://www.wsdot.wa.gov/ferries/api/schedule/rest/routes/${today}/${tid}/${destId}?apiaccesscode=${API_KEY}`;
      const rRes = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const rText = await rRes.text();

      // Parse XML or JSON
      if (rText.trim().startsWith('<')) {
        const routeName = rText.match(/<ArrivingTerminalName>(.*?)<\/ArrivingTerminalName>/)?.[1] || "Destination";
        const depId = rText.match(/<DepartingTerminalID>(.*?)<\/DepartingTerminalID>/)?.[1] || tid;
        const timeBlocks = rText.match(/<TerminalTime>[\s\S]*?<\/TerminalTime>/g) || [];
        
        return {
          ArrivingTerminalName: routeName,
          DepartingTerminalID: depId,
          Sailings: timeBlocks.map(block => ({
            Time: block.match(/<DepartingTime>(.*?)<\/DepartingTime>/)?.[1],
            Vessel: block.match(/<VesselName>(.*?)<\/VesselName>/)?.[1] || "TBA"
          }))
        };
      } else {
        const route = JSON.parse(rText);
        // Handle case where it returns a single object or an array
        const actualRoute = Array.isArray(route) ? route[0] : route;
        return {
          ArrivingTerminalName: actualRoute.ArrivingTerminalName,
          DepartingTerminalID: actualRoute.DepartingTerminalID,
          Sailings: (actualRoute.StopTimes || []).map(s => ({ 
            Time: s.DepartureTime, 
            Vessel: s.VesselName 
          }))
        };
      }
    });

    const routes = await Promise.all(routeRequests);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ routes, debugUrl: matesUrl });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
