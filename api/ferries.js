export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';

  // WSDOT requires current date in YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  // Map of origin terminals to their common destinations
  const routeMap = {
    "7": ["3", "4"],    // Seattle -> Bainbridge, Bremerton
    "3": ["7"],         // Bainbridge -> Seattle
    "4": ["7"],         // Bremerton -> Seattle
    "9": ["15"],        // Edmonds -> Kingston
    "15": ["9"],        // Kingston -> Edmonds
    "11": ["22", "19"], // Fauntleroy -> Vashon, Southworth
    "22": ["11", "19"], // Vashon -> Fauntleroy, Southworth
    "19": ["11", "22"], // Southworth -> Fauntleroy, Vashon
    "14": ["10"],       // Mukilteo -> Clinton
    "10": ["14"],       // Clinton -> Mukilteo
    "1": ["20", "21"]   // Anacortes -> Friday Harbor, Orcas
  };

  const destinations = routeMap[tid] || [];

  try {
    // Fetch all routes from this terminal in parallel
    const requests = destinations.map(destId => 
      fetch(`https://www.wsdot.wa.gov/ferries/api/schedule/rest/routes/${today}/${tid}/${destId}?apiaccesscode=${API_KEY}`)
        .then(async r => {
          if (!r.ok) return [];
          return r.json();
        })
    );

    const results = await Promise.all(requests);
    const flatResults = results.flat();

    // Standardize the data for our frontend
    const formattedData = flatResults.map(route => ({
      ArrivingDescription: route.ArrivingTerminalName,
      DepartingTerminalID: route.DepartingTerminalID,
      Times: (route.StopTimes || []).map(stop => ({
        DepartingTime: stop.DepartureTime,
        VesselName: stop.VesselName
      }))
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ TerminalComboDetails: formattedData });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
