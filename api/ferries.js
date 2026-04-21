export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';

  const soapUrl = 'https://www.wsdot.wa.gov/Ferries/API/Schedule/Service.svc';
  
  // The SOAP Envelope specifically for 'GetTerminalComboToday'
  const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.wsdot.wa.gov/ferries/schedule/">
       <soapenv:Header/>
       <soapenv:Body>
          <sch:GetTerminalComboToday>
             <sch:terminalID>${tid}</sch:terminalID>
             <sch:apiAccessCode>${API_KEY}</sch:apiAccessCode>
          </sch:GetTerminalComboToday>
       </soapenv:Body>
    </soapenv:Envelope>
  `.trim();

  try {
    const response = await fetch(soapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': 'http://www.wsdot.wa.gov/ferries/schedule/WSF_x0020_Schedule/GetTerminalComboToday'
      },
      body: soapEnvelope
    });

    const xml = await response.text();

    // Helper to extract data from XML tags
    const getTag = (str, tag) => {
      const match = str.match(new RegExp(`<[^:]*?:?${tag}[^>]*>([\\s\\S]*?)<\\/[^:]*?:?${tag}>`, 'i'));
      return match ? match[1] : null;
    };

    // Parse the SOAP response
    const comboBlocks = xml.match(/<[^:]*?:?TerminalComboDetail>[\s\S]*?<\/[^:]*?:?TerminalComboDetail>/gi) || [];
    
    const combos = comboBlocks.map(block => {
      const arriving = getTag(block, 'ArrivingDescription');
      const depId = getTag(block, 'DepartingTerminalID');
      
      const timeBlocks = block.match(/<[^:]*?:?TerminalTime>[\s\S]*?<\/[^:]*?:?TerminalTime>/gi) || [];
      const times = timeBlocks.map(t => ({
        DepartingTime: getTag(t, 'DepartingTime'),
        VesselName: getTag(t, 'VesselName')
      }));

      return {
        ArrivingDescription: arriving,
        DepartingTerminalID: depId,
        Times: times
      };
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ TerminalComboDetails: combos });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
