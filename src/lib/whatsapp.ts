// wa.me wants digits only, country code included (e.g. 919876543210)
export const normalizePhone = (raw?: string | null): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 8) return null;

  // A number typed without "+" and no longer than a local number has no country code
  if (!raw.trim().startsWith("+") && digits.length <= 10) {
    return `${process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? ""}${digits}`;
  }
  return digits;
};

// Click-to-chat link: opens WhatsApp with the message typed, the sender just presses Send
export const buildWhatsAppLink = (phone: string, text: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
