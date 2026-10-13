import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import { auth } from "@/firebase/firebase_setup";
import { getIdToken } from "firebase/auth";
import { clearPinUnlock, getPinUnlockToken, PIN_REQUIRED_EVENT } from "@/utils/pin";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_BASE_URL, // or use process.env.REACT_APP_BASE_URL
  prepareHeaders: async (headers) => {
    const user = auth.currentUser;
    if (user) {
      const token = await getIdToken(user);
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
    }
    const pinToken = getPinUnlockToken();
    if (pinToken) headers.set("x-pin-token", pinToken);
    return headers;
  },
});

export const baseQueryWithReauth: BaseQueryFn<any, unknown, unknown> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error && result.error.status === 401) {
    try {
      const user = auth.currentUser;
      if (user) {
        const newToken = await getIdToken(user, true); // force refresh
        if (newToken) {
          // Retry the request with refreshed token
          result = await rawBaseQuery(args, api, extraOptions);
        }
      }
    } catch (error) {
      console.error("Token refresh failed", error);
    }
  }

  // The backend wants the PIN again (unlock expired): lock the app so the PIN screen appears.
  const err = result?.error as { status?: number; data?: { code?: string } } | undefined;
  if (err?.status === 403 && err.data?.code === "PIN_REQUIRED") {
    clearPinUnlock();
    window.dispatchEvent(new Event(PIN_REQUIRED_EVENT));
  }

  return result;
};
