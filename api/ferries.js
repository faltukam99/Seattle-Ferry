export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const originId = terminalId || '7'; // Default to Seattle
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Get all "Mates" for this terminal (where boats go from/to here)
    const matesUrl = `https://www.wsdot.wa.gov/ferries/api/schedule/rest/terminalmates/${today}/${originId}?apiaccesscode=${API_KEY}`;
    const matesResponse = await fetch(matesUrl, { headers: { 'Accept': 'application/json' } });
    const mates = await matesResponse.json();

    // 2. Fetch routes for every Terminal pair (e.g., Seattle-Bainbridge, Seattle-Bremerton)
    const routeRequests = mates.map(mate => {
      const destId = mate.TerminalID;
      return fetch(`https://www.wsdot.wa.gov/ferries/api/schedule/rest/routes/${today}/${originId}/${destId}?apiaccesscode=${API_KEY}`)
        .then(r => r.json());
    });

    const routesResults = await Promise.all(routeRequests);

    // 3. Format the data into Arrivals and Departures
    const formattedData = routesResults.flat().map(route => ({
      ArrivingTerminalName: route.ArrivingTerminalName,
      DepartingTerminalName: route.DepartingTerminalName,
      DepartingTerminalID: route.DepartingTerminalID,
      ArrivingTerminalID: route.ArrivingTerminalID,
      Sailings: (route.StopTimes || []).map(stop => ({
        Time: stop.DepartureTime,
        VesselName: stop.VesselName
      }))
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ routes: formattedData });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
