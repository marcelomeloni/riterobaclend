/**
 * Service to generate structured electronic invoice (NF-e v4.00) XML strings.
 */
class NfeXmlService {
  /**
   * Helper to compute Module 11 check digit for SEFAZ access key
   * @param {string} key43 First 43 digits of the key
   * @returns {number} Check digit (0-9)
   */
  static calculateCheckDigit(key43) {
    let sum = 0;
    let weight = 2;
    for (let i = key43.length - 1; i >= 0; i--) {
      sum += parseInt(key43[i]) * weight;
      weight++;
      if (weight > 9) weight = 2;
    }
    const remainder = sum % 11;
    return (remainder === 0 || remainder === 1) ? 0 : (11 - remainder);
  }

  /**
   * Generates a 44-digit SEFAZ Access Key
   * @param {object} params Key configuration parameters
   * @returns {{ chave: string, cNF: string, cDV: number }} Generated access key details
   */
  static generateAccessKey({ cUF, year, month, cnpj, mod, serie, nNF, tpEmis }) {
    // Generate an 8-digit random numeric code (cNF) to secure the key
    const cNF = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Format parameters
    const formattedYear = year.slice(-2); // e.g. "2026" -> "26"
    const formattedMonth = month.toString().padStart(2, "0");
    const formattedCnpj = cnpj.replace(/\D/g, "");
    const formattedMod = mod.toString().padStart(2, "0");
    const formattedSerie = serie.toString().padStart(3, "0");
    const formattedNNF = nNF.toString().padStart(9, "0");
    
    const key43 = `${cUF}${formattedYear}${formattedMonth}${formattedCnpj}${formattedMod}${formattedSerie}${formattedNNF}${tpEmis}${cNF}`;
    const cDV = this.calculateCheckDigit(key43);
    
    return {
      chave: `${key43}${cDV}`,
      cNF,
      cDV
    };
  }

  /**
   * Builds the raw, unsigned XML for NF-e v4.00
   * @param {object} order Order data enriched with client and items
   * @param {object} config Emissor / Sefaz credentials
   * @returns {{ xml: string, chave: string }} Generated XML and its access key
   */
  static buildNfeXml(order, config) {
    const today = new Date();
    const year = today.getFullYear().toString();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    
    // Default values/constants for the order
    const cUF = "35"; // São Paulo
    const nNF = order.numero_nfe || Math.floor(1000 + Math.random() * 9000); // In real scenario, sequential incremented id
    const { chave, cNF, cDV } = this.generateAccessKey({
      cUF,
      year,
      month,
      cnpj: config.cnpj,
      mod: "55",
      serie: "1",
      nNF,
      tpEmis: "1" // Normal
    });

    const emissionDate = today.toISOString().split(".")[0] + "-03:00"; // Brazilian offset

    // Normalize recipient data
    const client = order.cliente || {};
    const person = client.pessoa || {};
    const destName = (person.nome || "Consumidor Final").slice(0, 60).toUpperCase();
    const destCpf = (client.cpf || "").replace(/\D/g, "");
    
    // Address data normalization
    const address = order.endereco || {};
    const destStreet = (address.logradouro || "Rua Principal").slice(0, 60).toUpperCase();
    const destNumber = (address.numero || "S/N").slice(0, 10).toUpperCase();
    const destComplement = (address.complemento || "").slice(0, 60).toUpperCase();
    const destNeighborhood = (address.bairro || "Centro").slice(0, 60).toUpperCase();
    const destCityCode = address.codigo_municipio || "3550308"; // Default São Paulo city code
    const destCity = (address.localidade || address.cidade || "SAO PAULO").toUpperCase();
    const destUF = (address.uf || "SP").toUpperCase();
    const destCEP = (address.cep || "").replace(/\D/g, "");

    // Simples Nacional Coffee NCM/Taxes
    const COFFEE_NCM = "09012100"; // NCM for roasted ground coffee / beans
    const CFOP = destUF === "SP" ? "5102" : "6102"; // Inside / outside SP sales

    // Map order items to NF-e detail blocks
    let itemXMLs = "";
    let subtotal = 0;
    
    const items = order.item_pedido || [];
    items.forEach((item, index) => {
      const nItem = index + 1;
      const variant = item.variante_cafe || {};
      const cafe = variant.cafe || {};
      const coffeeName = `CAFE ESPECIAL RITERO - ${cafe.nome || "GRAOS"} ${variant.peso_gramas || 250}G`.slice(0, 120).toUpperCase();
      
      const qCom = parseFloat(item.quantidade || 1);
      const vUnCom = parseFloat(item.preco || 0);
      const vProd = parseFloat((qCom * vUnCom).toFixed(2));
      subtotal += vProd;

      itemXMLs += `
      <det nItem="${nItem}">
        <prod>
          <cProd>${variant.id || "1"}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${coffeeName}</xProd>
          <NCM>${COFFEE_NCM}</NCM>
          <CFOP>${CFOP}</CFOP>
          <uCom>UN</uCom>
          <qCom>${qCom.toFixed(4)}</qCom>
          <vUnCom>${vUnCom.toFixed(10)}</vUnCom>
          <vProd>${vProd.toFixed(2)}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>${qCom.toFixed(4)}</qTrib>
          <vUnTrib>${vUnCom.toFixed(10)}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <vTotTrib>${(vProd * 0.1345).toFixed(2)}</vTotTrib>
          <ICMS>
            <ICMSSN102>
              <orig>0</orig>
              <CSOSN>102</CSOSN>
            </ICMSSN102>
          </ICMS>
          <PIS>
            <PISNT>
              <CST>07</CST>
            </PISNT>
          </PIS>
          <COFINS>
            <COFINSNT>
              <CST>07</CST>
            </COFINSNT>
          </COFINS>
        </imposto>
      </det>`;
    });

    const freightVal = parseFloat(order.valor_frete || 0);
    const discountVal = parseFloat(order.valor_desconto || 0);
    const totalVal = parseFloat((subtotal + freightVal - discountVal).toFixed(2));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chave}" versao="4.00">
    <ide>
      <cUF>${cUF}</cUF>
      <cNF>${cNF}</cNF>
      <natOp>VENDA DE MERCADORIA</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>${nNF}</nNF>
      <dhEmi>${emissionDate}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>${destUF === "SP" ? 1 : 2}</idDest>
      <cMunFG>3550308</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${cDV}</cDV>
      <tpAmb>${config.environment}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>2</indPres>
      <procEmi>0</procEmi>
      <verProc>1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${config.cnpj.replace(/\D/g, "")}</CNPJ>
      <xNome>${config.razaoSocial.toUpperCase()}</xNome>
      <xFant>${(config.nomeFantasia || "RITERO").toUpperCase()}</xFant>
      <enderEmit>
        <xLgr>RUA DA TORREFACTORA</xLgr>
        <nro>100</nro>
        <xBairro>VILA DO CAFE</xBairro>
        <cMun>3550308</cMun>
        <xMun>SAO PAULO</xMun>
        <UF>SP</UF>
        <CEP>01001000</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderEmit>
      <IE>${config.ie.replace(/\D/g, "")}</IE>
      <CRT>${config.crt}</CRT>
    </emit>
    <dest>
      <CPF>${destCpf}</CPF>
      <xNome>${destName}</xNome>
      <enderDest>
        <xLgr>${destStreet}</xLgr>
        <nro>${destNumber}</nro>
        ${destComplement ? `<xCpl>${destComplement}</xCpl>` : ""}
        <xBairro>${destNeighborhood}</xBairro>
        <cMun>${destCityCode}</cMun>
        <xMun>${destCity}</xMun>
        <UF>${destUF}</UF>
        <CEP>${destCEP}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderDest>
      <indIEDest>9</indIEDest>
      ${person.email ? `<email>${person.email}</email>` : ""}
    </dest>
    ${itemXMLs}
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vBC>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${subtotal.toFixed(2)}</vProd>
        <vFrete>${freightVal.toFixed(2)}</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>${discountVal.toFixed(2)}</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${totalVal.toFixed(2)}</vNF>
        <vTotTrib>${(subtotal * 0.1345).toFixed(2)}</vTotTrib>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>0</modFrete>
    </transp>
    <pag>
      <detPag>
        <tPag>17</tPag> <!-- Pix (electronic) or credit card depending on metadata -->
        <vPag>${totalVal.toFixed(2)}</vPag>
      </detPag>
    </pag>
    <infAdic>
      <infCpl>Empresa optante pelo Simples Nacional. Documento emitido por ME ou EPP. Trib. aprox: R$ ${(subtotal * 0.1345).toFixed(2)} Federal (Lei 12.741/12).</infCpl>
    </infAdic>
  </infNFe>
</NFe>`.trim();

    return { xml, chave };
  }
}

module.exports = NfeXmlService;
