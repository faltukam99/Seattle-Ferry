export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7'; 
  const today = new Date().toISOString().split('T')[0];

  // The Discovery URL: Finds where boats go from this pier
  const matesUrl = `https://www.wsdot.wa.gov/ferries/api/schedule/rest/terminalmates/${today}/${tid}?apiaccesscode=${API_KEY}`;

  try {
    const matesRes = await fetch(matesUrl, { headers: { 'Accept': 'application/json' } });
    const mates = await matesRes.json();

    if (!Array.isArray(mates) || mates.length === 0) {
      return res.status(200).json({ routes: [], debugUrl: matesUrl });
    }

    const routeRequests = mates.map(mate => {
      const url = `https://www.wsdot.wa.gov/ferries/api/schedule/rest/routes/${today}/${tid}/${mate.TerminalID}?apiaccesscode=${API_KEY}`;
      return fetch(url, { headers: { 'Accept': 'application/json' } }).then(r => r.json());
    });

    const results = await Promise.all(routeRequests);

    const formattedData = results.flat().map(route => ({
      ArrivingTerminalName: route.ArrivingTerminalName,
      DepartingTerminalID: route.DepartingTerminalID,
      DepartingTerminalName: route.DepartingTerminalName,
      Sailings: (route.StopTimes || []).map(stop => ({
        Time: stop.DepartureTime,
        Vessel: stop.VesselName || "TBA"
      }))
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ 
      routes: formattedData, 
      debugUrl: matesUrl 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
