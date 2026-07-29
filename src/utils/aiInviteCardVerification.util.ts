import Tesseract from "tesseract.js";
import stringSimilarity from "string-similarity";
import { InvitationEventData } from "./aiInviteCardPromptBuilder.util";

export interface VerificationResult {
  passed: boolean;
  mismatches: string[];
}

function fuzzyContains(text: string, target: string, threshold = 0.8): boolean {
  if (!target) return true;
  
  const targetLower = target.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (textLower.includes(targetLower)) return true;

  // Simple sliding window for fuzzy match
  const words = textLower.split(/\s+/);
  const targetWords = targetLower.split(/\s+/).length;
  
  for (let i = 0; i <= words.length - targetWords; i++) {
    const chunk = words.slice(i, i + targetWords).join(" ");
    const similarity = stringSimilarity.compareTwoStrings(chunk, targetLower);
    if (similarity >= threshold) {
      return true;
    }
  }

  return false;
}

function fuzzyContainsAddress(text: string, target: string, threshold = 0.7): boolean {
  // Address matching can be slightly more lenient
  return fuzzyContains(text, target, threshold);
}

export async function verifyInvitationText(
  imageBuffer: Buffer,
  eventData: InvitationEventData
): Promise<VerificationResult> {
  const mismatches: string[] = [];

  try {
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');

    if (!fuzzyContains(text, eventData.brideName)) mismatches.push("brideName");
    if (!fuzzyContains(text, eventData.groomName)) mismatches.push("groomName");
    if (!fuzzyContains(text, eventData.eventDateDisplay)) mismatches.push("eventDateDisplay");
    if (!fuzzyContains(text, eventData.eventTimeDisplay)) mismatches.push("eventTimeDisplay");
    if (!fuzzyContains(text, eventData.venueName)) mismatches.push("venueName");
    if (!fuzzyContainsAddress(text, eventData.venueFullAddress)) mismatches.push("venueFullAddress");
    
  } catch (error) {
    console.error("OCR verification failed:", error);
    mismatches.push("OCR_FAILED");
  }

  return {
    passed: mismatches.length === 0,
    mismatches
  };
}
