// Must match the localStorage key custom-fetch.ts (lib/api-client-react)
// reads/writes on every request -- currently hardcoded there as
// "rivora_token". Keep both in sync.
const TOKEN_KEY = "rivora_token";

export const getToken = () => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);
export const setToken = (t: string) => typeof window !== "undefined" && localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => typeof window !== "undefined" && localStorage.removeItem(TOKEN_KEY);
