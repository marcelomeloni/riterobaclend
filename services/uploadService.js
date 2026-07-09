const { supabase } = require("../config/supabase");
const crypto = require("crypto");
const path = require("path");

const BUCKET = "cafes";

/**
 * Faz upload de um arquivo para o bucket "cafes" no Supabase Storage.
 * @param {Buffer} buffer – Conteúdo do arquivo
 * @param {string} originalName – Nome original do arquivo
 * @param {string} mimetype – Tipo MIME
 * @param {string} folder – Subpasta dentro do bucket (ex: "variantes")
 * @returns {{ publicUrl: string }} URL pública do arquivo
 */
async function uploadFile(buffer, originalName, mimetype, folder = "") {
  const ext = path.extname(originalName) || ".jpg";
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const filePath = folder ? `${folder}/${uniqueName}` : uniqueName;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) throw new Error(`Erro no upload: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return { publicUrl: data.publicUrl };
}

/**
 * Remove um arquivo do bucket pelo caminho (path relativo ao bucket).
 * @param {string} fileUrl – URL pública completa
 */
async function deleteFile(fileUrl) {
  if (!fileUrl) return;

  // Extrai o path relativo a partir da URL pública
  const parts = fileUrl.split(`/storage/v1/object/public/${BUCKET}/`);
  if (parts.length < 2) return;

  const filePath = parts[1];

  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) console.error("Erro ao deletar arquivo:", error.message);
}

module.exports = { uploadFile, deleteFile };
