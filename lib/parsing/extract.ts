/**
 * Text extraction from PDF and DOCX files (PRD FR-4, TECHSTACK section 3).
 * Uses unpdf for serverless PDF extraction and mammoth for DOCX extraction.
 */

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const { extractText } = await import("unpdf");
    const result = await extractText(new Uint8Array(buffer));
    const text = Array.isArray(result.text) ? result.text.join("\n") : (result.text || "");
    return text.trim();
  } catch (err: any) {
    console.error("[Parsing] Error extracting PDF with unpdf:", err);
    throw new Error(`PDF text extraction failed: ${err.message}`);
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = (await import("mammoth")).default || (await import("mammoth"));
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  } catch (err: any) {
    console.error("[Parsing] Error extracting DOCX with mammoth:", err);
    throw new Error(`DOCX text extraction failed: ${err.message}`);
  }
}

export async function extractTextFromFile(
  fileName: string,
  buffer: Buffer
): Promise<{ text: string; isScan: boolean }> {
  const lower = fileName.toLowerCase();
  let text = "";

  if (lower.endsWith(".pdf")) {
    text = await extractTextFromPdf(buffer);
  } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    text = await extractTextFromDocx(buffer);
  } else {
    // Fallback: try utf-8 text
    text = buffer.toString("utf-8");
  }

  // PRD FR-4 / TECHSTACK section 3:
  // If extracted text < 200 chars, it's flagged as scanned / needs_ocr
  const isScan = text.trim().length < 200;

  return { text, isScan };
}
