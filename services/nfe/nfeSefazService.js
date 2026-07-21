const axios = require("axios");
const https = require("https");
const xml2js = require("xml2js");

/**
 * Service to execute SOAP requests to SEFAZ Web Services with Mutual TLS authentication.
 */
class NfeSefazService {
  /**
   * Generates custom HTTPS Agent for SEFAZ MTLS Client Authentication
   * @param {Buffer} pfxBuffer PFX Certificate binary buffer
   * @param {string} password Certificate passphrase
   * @returns {https.Agent} HTTPS Agent configured with client certificates
   */
  static getHttpsAgent(pfxBuffer, password) {
    return new https.Agent({
      pfx: pfxBuffer,
      passphrase: password,
      keepAlive: true,
      rejectUnauthorized: false // SEFAZ CA chain might not be natively trusted by Node.js
    });
  }

  /**
   * Helper to parse XML to Javascript object
   * @param {string} xmlXml Raw XML response
   * @returns {Promise<object>} Parsed JS object representation
   */
  static parseXml(xmlXml) {
    return new Promise((resolve, reject) => {
      xml2js.parseString(xmlXml, { explicitArray: false, ignoreAttrs: true }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Submits NF-e to NfeAutorizacao4 Web Service
   * @param {string} signedXml Signed NF-e XML
   * @param {Buffer} pfxBuffer PFX binary buffer
   * @param {string} pfxPassword PFX passphrase
   * @param {string} url SEFAZ NfeAutorizacao endpoint (default is SP Homologacao)
   * @returns {Promise<{ rawResponse: string, parsed: object }>} Response payload
   */
  static async submitLote(signedXml, pfxBuffer, pfxPassword, url) {
    const targetUrl = url || "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx";
    
    // Wrap inside standard SOAP 1.2 envelope
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao4">
      <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <idLote>${Math.floor(100000 + Math.random() * 900000)}</idLote>
        <indSinc>0</indSinc> <!-- Asynchronous submission -->
        ${signedXml}
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`.trim();

    const agent = this.getHttpsAgent(pfxBuffer, pfxPassword);

    const response = await axios.post(targetUrl, soapEnvelope, {
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
      },
      httpsAgent: agent,
      timeout: 15000
    });

    const parsed = await this.parseXml(response.data);
    return {
      rawResponse: response.data,
      parsed
    };
  }

  /**
   * Queries NF-e authorization results via NfeRetAutorizacao4 Web Service
   * @param {string} receiptNo Receipt number (nRec)
   * @param {Buffer} pfxBuffer PFX binary buffer
   * @param {string} pfxPassword PFX passphrase
   * @param {string} url SEFAZ NfeRetAutorizacao endpoint (default is SP Homologacao)
   * @returns {Promise<{ rawResponse: string, parsed: object }>} Response payload
   */
  static async queryLoteResult(receiptNo, pfxBuffer, pfxPassword, url) {
    const targetUrl = url || "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx";
    const environment = process.env.NFE_ENVIRONMENT || "2";

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeRetAutorizacao4">
      <consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>${environment}</tpAmb>
        <nRec>${receiptNo}</nRec>
      </consReciNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`.trim();

    const agent = this.getHttpsAgent(pfxBuffer, pfxPassword);

    const response = await axios.post(targetUrl, soapEnvelope, {
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
      },
      httpsAgent: agent,
      timeout: 15000
    });

    const parsed = await this.parseXml(response.data);
    return {
      rawResponse: response.data,
      parsed
    };
  }
}

module.exports = NfeSefazService;
