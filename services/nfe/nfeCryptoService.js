const { SignedXml } = require("xml-crypto");
const forge = require("node-forge");
const fs = require("fs");

/**
 * Service to handle digital certificates (A1 .pfx) and XML cryptographic signing.
 */
class NfeCryptoService {
  /**
   * Load PFX certificate, extract private key and public cert
   * @param {string} pfxPath Path to A1 certificate
   * @param {string} password Certificate password
   * @returns {{ privateKeyPem: string, certPem: string, x509: string }} PEM representation of credentials
   */
  static loadCertificate(pfxPath, password) {
    if (!fs.existsSync(pfxPath)) {
      throw new Error(`PFX Certificate not found at path: ${pfxPath}`);
    }
    
    const pfxBuffer = fs.readFileSync(pfxPath);
    
    // Parse PKCS#12 archive
    const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"), false);
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);
    
    let privateKeyPem = "";
    let certPem = "";
    
    // Extract Private Key
    const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (keyBag) {
      privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
    } else {
      throw new Error("Failed to extract Private Key from PFX certificate.");
    }
    
    // Extract Public Certificate
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    if (certBag) {
      certPem = forge.pki.certificateToPem(certBag.cert);
    } else {
      throw new Error("Failed to extract Certificate from PFX certificate.");
    }
    
    // Clean certificate PEM representation for raw X509 text
    const x509 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, "")
      .replace(/-----END CERTIFICATE-----/, "")
      .replace(/\r?\n|\r/g, "");
      
    return { privateKeyPem, certPem, x509 };
  }

  /**
   * Generates SHA-1 digest and applies RSA-SHA1 enveloped signature to the NFe XML
   * @param {string} xmlString Raw unsigned XML string
   * @param {string} privateKeyPem Private Key in PEM format
   * @param {string} x509 Raw public certificate string (without header/footers)
   * @returns {string} Signed XML string containing <Signature> block
   */
  static signXml(xmlString, privateKeyPem, x509) {
    const sig = new SignedXml();
    
    // SEFAZ demands enveloped SHA1 signatures with Exclusive Canonicalization (C14N)
    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
    
    sig.addReference(
      "//*[local-name()='infNFe']", 
      [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/2001/10/xml-exc-c14n#"
      ], 
      "http://www.w3.org/2000/09/xmldsig#sha1"
    );
    
    sig.signingKey = privateKeyPem;
    sig.keyInfoProvider = {
      getKeyInfo: () => `<X509Data><X509Certificate>${x509}</X509Certificate></X509Data>`
    };
    
    // Perform signing on target element
    sig.computeSignature(xmlString);
    
    return sig.getSignedXml();
  }
}

module.exports = NfeCryptoService;
