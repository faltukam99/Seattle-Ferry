export default async function handler(req, res) {
  const API_KEY = '08c4d590-560c-49dd-9b30-e9089c77e02d';
  const { terminalId } = req.query;
  const tid = terminalId || '7';

  const soapUrl = 'https://www.wsdot.wa.gov/Ferries/API/Schedule/Service.svc';
  
  // WSDOT SOAP sometimes requires the date in MM/DD/YYYY for the "Schedule" service
  const now = new Date();
  const todayStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

  const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.wsdot.wa.gov/ferries/schedule/">
       <soapenv:Header/>
       <soapenv:Body>
          <sch:GetTerminalCombo>
             <sch:date>${todayStr}</sch:date>
             <sch:terminalID>${tid}</sch:terminalID>
             <sch:apiAccessCode>${API_KEY}</sch:apiAccessCode>
          </sch:GetTerminalCombo>
       </soapenv:Body>
    </soapenv:Envelope>
  `.trim();

  try {
    const response = await fetch(soapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': 'http://www.wsdot.wa.gov/ferries/schedule/WSF_x0020_Schedule/GetTerminalCombo'
      },
      body: soapEnvelope
    });

    const xml = await response.text();

    // If the XML is empty or contains an error message, let's see it
    if (xml.includes('Fault')) {
        return res.status(200).json({ error: "SOAP Fault", raw: xml.substring(0, 200) });
    }

    const getTag = (str, tag) => {
      const match = str.match(new RegExp(`<[^:]*?:?${tag}[^>]*>([\\s\\S]*?)<\\/[^:]*?:?${tag}>`, 'i'));
      return match ? match[1] : null;
    };

    // Improved parsing to catch namespaced tags
    const comboBlocks = xml.match(/<[^:]*?:?TerminalComboDetail>[\s\S]*?<\/[^:]*?:?TerminalComboDetail>/gi) || [];
    
    const combos = comboBlocks.map(block => {
      const arriving = getTag(block, 'ArrivingDescription');
      const depId = getTag(block, 'DepartingTerminalID');
      const depName = getTag(block, 'DepartingTerminalName');
      
      const timeBlocks = block.match(/<[^:]*?:?TerminalTime>[\s\S]*?<\/[^:]*?:?TerminalTime>/gi) || [];
      const times = timeBlocks.map(t => ({
        DepartingTime: getTag(t, 'DepartingTime'),
        VesselName: getTag(t, 'VesselName')
      }));

      return {
        ArrivingDescription: arriving,
        DepartingTerminalID: depId,
        DepartingTerminalName: depName,
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
