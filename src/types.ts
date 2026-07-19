export type EntryType = "login" | "note" | "custom";

export interface Field {
  k: string;
  v: string;
}

export interface Entry {
  id: string;
  type: EntryType;
  title: string;
  login: string;
  password: string;
  url: string;
  fields: Field[];
  note: string;
  updated: number;
}

export interface Vault {
  v: number;
  salt: string;
  entries: Entry[];
}
