import { ADZUNA_COUNTRIES, type AdzunaCountry } from "./adzuna";

// Every country the Find Jobs search can target, across all providers.
// Kept separate from ADZUNA_COUNTRIES (which must list only the countries
// Adzuna itself serves) so adding a country served by a different provider
// never widens what gets sent to Adzuna.

export const SUPPORTED_COUNTRIES = [...ADZUNA_COUNTRIES, "tr"] as const;

export type SearchCountry = AdzunaCountry | "tr";
