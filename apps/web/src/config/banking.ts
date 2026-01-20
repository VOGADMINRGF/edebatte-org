export type BankDetails = {
  recipient: string;
  iban: string;
  bic: string;
  bankName: string;
  referenceHint: string;
};

const fallback = (value: string | undefined, placeholder: string) =>
  value && value.trim().length > 0 ? value.trim() : placeholder;

export const BANK_DETAILS: BankDetails = {
  recipient: fallback(process.env.NEXT_PUBLIC_VOG_BANK_RECIPIENT, "eDebatte (Empfänger konfigurieren)"),
  iban: fallback(process.env.NEXT_PUBLIC_VOG_BANK_IBAN, "DE00 0000 0000 0000 0000 00"),
  bic: fallback(process.env.NEXT_PUBLIC_VOG_BANK_BIC, "BANKDEFFXXX"),
  bankName: fallback(process.env.NEXT_PUBLIC_VOG_BANK_NAME, "Hausbank"),
  referenceHint: fallback(
    process.env.NEXT_PUBLIC_VOG_BANK_REFERENCE,
    "eDebatte Beitrag / Gutschrift",
  ),
};
