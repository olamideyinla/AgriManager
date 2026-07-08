/**
 * Single source of truth for public contact details.
 * WHATSAPP_NUMBER must be digits only, international format without '+' (e.g. '2348012345678').
 */
export const WHATSAPP_NUMBER = '2348035014742'

export function whatsAppLink(text?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
