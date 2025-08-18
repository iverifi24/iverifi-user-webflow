import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import { auth } from "@/firebase/firebase_setup";
import { getIdToken } from "firebase/auth";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "http://localhost:9000/api/v1", // or use process.env.REACT_APP_BASE_URL
  prepareHeaders: async (headers) => {
    const user = auth.currentUser;
    if (user) {
      const token = await getIdToken(user);
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
    }
    return headers;
  },
});

export const baseQueryWithReauth: BaseQueryFn<any, unknown, unknown> = async (
  args,
  api,
  extraOptions
) => {
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

  return result;
};
