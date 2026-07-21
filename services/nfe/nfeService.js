const fs = require("fs");
const path = require("path");
const { supabase } = require("../../config/supabase");
const NfeCryptoService = require("./nfeCryptoService");
const NfeXmlService = require("./nfeXmlService");
const NfeSefazService = require("./nfeSefazService");
const DanfeService = require("./danfeService");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Orchestrator service to handle the end-to-end NF-e emission workflow:
 * 1. Fetch Order data
 * 2. Generate XML
 * 3. Crytographic digital signature
 * 4. Submit to SEFAZ
 * 5. Polling response
 * 6. Wrap authorized protocol (nfeProc)
 * 7. Generate DANFE PDF (stub)
 * 8. Upload to Supabase Bucket
 * 9. Update DB
 */
class NfeService {
  /**
   * Fetches SEFAZ configuration from environment variables
   */
  static getSefazConfig() {
    return {
      pfxPath: process.env.NFE_CERTIFICATE_PATH || path.join(__dirname, "../../../certs/homologacao.pfx"),
      pfxPassword: process.env.NFE_CERTIFICATE_PASSWORD || "123456",
      cnpj: process.env.NFE_EMISSOR_CNPJ || "12345678000199",
      ie: process.env.NFE_EMISSOR_IE || "123456789110",
      razaoSocial: process.env.NFE_EMISSOR_RAZAO_SOCIAL || "RITERO CAFES ESPECIAIS LTDA",
      nomeFantasia: process.env.NFE_EMISSOR_NOME_FANTASIA || "RITERO",
      crt: process.env.NFE_EMISSOR_CRT || "1", // 1 = Simples Nacional
      environment: process.env.NFE_ENVIRONMENT || "2" // 1 = Producao, 2 = Homologacao
    };
  }

  /**
   * Performs end-to-end invoice emission for a specific order
   * @param {string} orderId UUID of the order
   * @returns {Promise<object>} Updated order details containing keys/urls
   */
  static async emitInvoice(orderId) {
    console.log(`[NFE] Initializing invoice emission for order: ${orderId}`);
    
    // 1. Fetch full order details
    const pedidoService = require("../pedidoService");
    const order = await pedidoService.getById(orderId);
    
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const config = this.getSefazConfig();
    
    // 2. Read client certificate
    const { privateKeyPem, x509 } = NfeCryptoService.loadCertificate(config.pfxPath, config.pfxPassword);
    const pfxBuffer = fs.readFileSync(config.pfxPath);
    
    // 3. Build Raw unsigned XML
    console.log("[NFE] Building unsigned XML...");
    const { xml: unsignedXml, chave } = NfeXmlService.buildNfeXml(order, config);
    
    // 4. Cryptographic XML digital signature
    console.log(`[NFE] Signing XML for key: ${chave}`);
    const signedXml = NfeCryptoService.signXml(unsignedXml, privateKeyPem, x509);
    
    // 5. Submit to SEFAZ NfeAutorizacao
    console.log("[NFE] Submitting invoice to SEFAZ Web Service...");
    const submitResult = await NfeSefazService.submitLote(signedXml, pfxBuffer, config.pfxPassword);
    
    // Parse submit response to get receipt number (nRec)
    const retEnviNFe = submitResult.parsed["soap12:Envelope"]?.["soap12:Body"]?.nfeResultMsg?.retEnviNFe;
    if (!retEnviNFe || retEnviNFe.cStat !== "103") {
      throw new Error(`SEFAZ batch submission rejected. Code: ${retEnviNFe?.cStat} - Msg: ${retEnviNFe?.xMotivo}`);
    }
    
    const receiptNo = retEnviNFe.infRec?.nRec;
    console.log(`[NFE] Batch received by SEFAZ. Receipt number: ${receiptNo}. Starting polling...`);

    // 6. Polling SEFAZ using NfeRetAutorizacao for the authorization protocol
    let attempts = 0;
    const maxAttempts = 6;
    let retConsReciNFe = null;
    let authorized = false;

    while (attempts < maxAttempts && !authorized) {
      attempts++;
      console.log(`[NFE] Polling authorization protocol (Attempt ${attempts}/${maxAttempts})...`);
      await sleep(3500); // SEFAZ asks to wait at least 3 seconds between requests

      const pollResult = await NfeSefazService.queryLoteResult(receiptNo, pfxBuffer, config.pfxPassword);
      retConsReciNFe = pollResult.parsed["soap12:Envelope"]?.["soap12:Body"]?.nfeResultMsg?.retConsReciNFe;

      if (!retConsReciNFe) {
        console.warn("[NFE] Empty response from SEFAZ status query.");
        continue;
      }

      // Code 104 = Processed, now check the specific NFe status inside the protocol
      if (retConsReciNFe.cStat === "104") {
        const protNFe = retConsReciNFe.protNFe;
        const cStatNfe = protNFe?.infProt?.cStat;
        
        if (cStatNfe === "100") { // 100 = Authorized
          authorized = true;
          console.log(`[NFE] Invoice successfully authorized by SEFAZ! Protocol: ${protNFe.infProt.nProt}`);
        } else {
          throw new Error(`Invoice rejected by SEFAZ. Status code: ${cStatNfe} - Reason: ${protNFe?.infProt?.xMotivo}`);
        }
      } else if (retConsReciNFe.cStat === "105") { // 105 = Batch in processing
        console.log("[NFE] Batch is still in processing. Retrying...");
      } else {
        throw new Error(`SEFAZ batch verification failed. Code: ${retConsReciNFe.cStat} - Msg: ${retConsReciNFe.xMotivo}`);
      }
    }

    if (!authorized) {
      throw new Error(`SEFAZ polling timeout reached for receipt: ${receiptNo}`);
    }

    // 7. Wrap authorized XML using standard <nfeProc> tag
    // Convert protNFe object back to raw XML tag string to append properly
    const builder = new xml2js.Builder({ headless: true, renderOpts: { pretty: false } });
    const protNFeXml = builder.buildObject({ protNFe: retConsReciNFe.protNFe });
    
    const xmlAuthorized = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  ${signedXml.replace('<?xml version="1.0" encoding="UTF-8"?>', "").trim()}
  ${protNFeXml}
</nfeProc>`.trim();

    // 8. Generate DANFE PDF
    const pdfBuffer = await DanfeService.generateDanfePdf(xmlAuthorized);

    // 9. Upload files to Supabase "nfe-documents" bucket
    console.log("[NFE] Uploading XML and PDF to Supabase storage...");
    const xmlFileName = `${orderId}/NFe-${chave}.xml`;
    const pdfFileName = `${orderId}/DANFE-${chave}.pdf`;

    // Upload XML
    const { error: xmlUploadErr } = await supabase.storage
      .from("nfe-documents")
      .upload(xmlFileName, Buffer.from(xmlAuthorized, "utf-8"), {
        contentType: "text/xml",
        upsert: true
      });
    if (xmlUploadErr) throw new Error(`Supabase Storage XML upload error: ${xmlUploadErr.message}`);

    // Upload PDF
    const { error: pdfUploadErr } = await supabase.storage
      .from("nfe-documents")
      .upload(pdfFileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true
      });
    if (pdfUploadErr) throw new Error(`Supabase Storage PDF upload error: ${pdfUploadErr.message}`);

    // Get public urls
    const { data: xmlUrlData } = supabase.storage.from("nfe-documents").getPublicUrl(xmlFileName);
    const { data: pdfUrlData } = supabase.storage.from("nfe-documents").getPublicUrl(pdfFileName);

    // 10. Persist results in the database
    console.log("[NFE] Persisting invoice access credentials in the database...");
    const { error: updateErr } = await supabase
      .from("pedido")
      .update({
        nfe_chave: chave,
        nfe_xml_url: xmlUrlData.publicUrl,
        nfe_pdf_url: pdfUrlData.publicUrl
      })
      .eq("id", orderId);

    if (updateErr) throw updateErr;

    console.log(`[NFE] Invoice pipeline finished successfully for order: ${orderId}!`);
    return {
      chave,
      xmlUrl: xmlUrlData.publicUrl,
      pdfUrl: pdfUrlData.publicUrl
    };
  }
}

module.exports = NfeService;
