// Cookie names, kept apart from the API client so src/proxy.ts can read them without loading it.
export const DATA_SOURCE_COOKIE = "ewarp-data-source";
// The signed-in user's token (httpOnly). Set by the login page, cleared on sign out.
export const SESSION_COOKIE = "ewarp-session";
