export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const today = new Date().toISOString().split('T')[0];
  
  // Seattle routes according to WSDOT: 7 (Bainbridge) and 8 (Bremerton)
  const routesToFetch = ['7', '8'];

  try {
    const requests = routesToFetch.map(routeId => 
      fetch(`https://www.wsdot.wa.gov/ferries/api/schedule/rest/schedule/${today}/${routeId}?apiaccesscode=${API_KEY}`, {
        headers: { 'Accept': 'application/json' }
      }).then(r => r.json())
    );

    const results = await Promise.all(requests);

    // Flatten all terminal combinations (Sailings) into one list
    const allSailings = results.flatMap(routeData => 
      (routeData.TerminalCombos || []).map(combo => ({
        RouteName: routeData.ScheduleName,
        DepartingTerminal: combo.DepartingTerminalName,
        ArrivingTerminal: combo.ArrivingTerminalName,
        Times: (combo.Times || []).map(t => ({
          Time: t.DepartingTime,
          Vessel: t.VesselName || "TBA"
        }))
      }))
    );

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ routes: allSailings });

  } catch (error) {
    return res.status(500).json({ error: "REST API Error", details: error.message });
  }
}
