import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Loads the synthetic CVs. The YAML front matter is metadata for us only;
// `text` has it stripped, and `text` is the only thing any system may see.

export interface CvMeta {
  id: string;
  role_family: string;
  seniority: string;
  years_experience: string;
  cv_language: string;
  search_query: string;
  neighbour_query: string;
  search_country: string;
  format: string;
  twist: string;
}

export interface Cv {
  meta: CvMeta;
  text: string;
}

export const CV_DIR = join(import.meta.dirname, "..", "..", "data", "cvs");

export function parseCv(raw: string): Cv {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error("CV is missing front matter");
  const meta = Object.fromEntries(
    match[1].split("\n").map((line) => {
      const i = line.indexOf(": ");
      return [line.slice(0, i), line.slice(i + 2)];
    }),
  ) as unknown as CvMeta;
  return { meta, text: raw.slice(match[0].length).trim() };
}

export function loadCvs(dir: string = CV_DIR): Cv[] {
  return readdirSync(dir)
    .filter((f) => /^cv-\d+\.md$/.test(f))
    .sort()
    .map((f) => parseCv(readFileSync(join(dir, f), "utf8")));
}
