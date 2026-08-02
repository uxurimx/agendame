export const LEGAL_VERSIONS = {
  terms: "2026-08-02",
  privacy: "2026-08-02",
} as const;

export const LEGAL_ACCEPTANCE_STORAGE_KEY = "agendame_legal_acceptance";

export const LEGAL_PATHS = {
  terms: "/terminos-y-condiciones",
  privacy: "/aviso-de-privacidad",
} as const;

export const LEGAL_CHECKBOX_LABEL =
  "He leído y acepto los Términos y Condiciones, y reconozco el Aviso de Privacidad de Agéndame.";

export type LegalAcceptancePayload = {
  accepted: true;
  termsVersion: string;
  privacyVersion: string;
};
