import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./base_query_with_reauth";

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "fuelStations",
    "getTransaction",
    "role",
    "admin",
    "status",
    "myCampaign",
    "userManagement",
    "reward",
    "connections",
  ],
  endpoints: (builder) => ({
    getCredentials: builder.query<any, void>({
      query: () => ({
        url: "/users/listAllCredentials",
        method: "GET",
      }),
      // providesTags: ["admin"],
    }),
    getConnections: builder.query<any, void>({
      query: () => ({
        url: "/users/listOfCredentialsRequest",
        method: "GET",
      }),
      providesTags: ["connections"],
    }),
    getRecipientCredentials: builder.query<any, string>({
      query: (recipientId) => ({
        url: `/users/getRecipientCredentials`,
        method: "GET",
        params: { recipient_id: recipientId },
      }),
      // providesTags: ["connections"],
    }),
    addConnection: builder.mutation({
      query: ({ document_id, type }) => ({
        url: "/users/addConnection",
        method: "POST",
        body: {
          document_id,
          type, // Pass "Company" or "Individual"
        },
      }),
      invalidatesTags: ["connections"],
    }),
    updateCredentialsRequest: builder.mutation({
      query: ({ credential_request_id, credentials }) => ({
        url: "/users/updateCredentialsRequest",
        method: "POST",
        body: {
          credential_request_id,
          credentials,
        },
      }),
      invalidatesTags: ["connections"],
    }),
    login: builder.mutation({
      query: (data) => ({ url: "/admin/login", method: "POST", body: data }),
    }),
    signup: builder.mutation({
      query: (data) => ({ url: "/user/signup", method: "POST", body: data }),
    }),
    getAllFuelStations: builder.query({
      query: (data) => ({
        url: `/admin/fuelStation`,
        method: "GET",
        params: data,
      }),
      providesTags: ["fuelStations"],
    }),
    getFuelStationById: builder.query({
      query: (id) => ({
        url: `/admin/fuelStation/${id}`,
        method: "GET",
      }),
      providesTags: ["fuelStations"],
    }),
    updateFuelStation: builder.mutation({
      query: ({ data, id }) => ({
        url: `/admin/fuelStation/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["fuelStations"],
    }),
    addFuelStationData: builder.mutation({
      query: (data) => ({
        url: "/admin/fuelStation",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["fuelStations"],
    }),
    deleteFuelStation: builder.mutation({
      query: (id) => ({
        url: `/admin/fuelStation/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["fuelStations"],
    }),
    getAllTransactionHistory: builder.query({
      query: (data) => ({
        url: `/admin/getTransaction`,
        method: "GET",
        params: data,
      }),
      providesTags: ["getTransaction"],
    }),
    getAllRewardHistory: builder.query({
      query: (data) => ({
        url: `/admin/getRewardHistory`,
        method: "GET",
        params: data,
      }),
      //   providesTags: ["getRewardHistory"],
    }),
    getUserData: builder.query({
      query: (data) => ({
        url: "/user",
        method: "GET",
        params: data,
      }),
      providesTags: ["userManagement"],
    }),
    getRewardData: builder.query({
      query: (data) => ({
        url: "/reward",
        method: "GET",
        params: data,
      }),
      providesTags: ["reward"],
    }),
    SendReward: builder.mutation({
      query: (data) => ({
        url: "/admin/sendReward",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["userManagement"],
    }),

    getUserById: builder.query({
      query: (id) => ({
        url: `/admin/user/${id}`,
        method: "GET",
      }),
      providesTags: ["userManagement"],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/admin/user/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["userManagement"],
    }),

    editReward: builder.mutation({
      query: ({ data, id }) => ({
        url: `/reward/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["reward"],
    }),
    deleteReward: builder.mutation({
      query: (id) => ({
        url: `/reward/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["reward"],
    }),

    getRewardById: builder.query({
      query: (id) => ({
        url: `/reward/${id}`,
        method: "GET",
      }),
      providesTags: ["reward"],
    }),
    updateUserStatus: builder.mutation({
      query: (id) => ({
        url: `/admin/userStatus/${id}`,
        method: "GET",
      }),
      invalidatesTags: ["userManagement"],
    }),
    addReward: builder.mutation({
      query: (data) => ({
        url: "/reward",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["reward"],
    }),
    getAllRolesData: builder.query({
      query: (data) => ({
        url: "/admin/roles",
        method: "GET",
        params: data,
      }),
      providesTags: ["role"],
    }),
    deleteRoleData: builder.mutation({
      query: (id) => ({
        url: `/admin/role/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["role"],
    }),
    getAllRoutes: builder.query({
      query: () => ({
        url: "/admin/routes",
        method: "GET",
      }),
    }),
    addRoleData: builder.mutation({
      query: (data) => ({
        url: "/admin/addRoles",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["role"],
    }),
    getRoleById: builder.query({
      query: (id) => ({
        url: `/admin/role/${id}`,
        method: "GET",
      }),
      providesTags: ["role"],
    }),
    updateRoleData: builder.mutation({
      query: ({ data, id }) => ({
        url: `/admin/updateRoles/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["role"],
    }),

    adminCreateUser: builder.mutation({
      query: (data) => ({
        url: "/admin/createUser",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["userManagement"],
    }),

    updateAdminUser: builder.mutation({
      query: ({ data, id }) => ({
        url: `/admin/updateUserDetails/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["userManagement"],
    }),
  }),
});
export const {
  useGetCredentialsQuery,
  useGetConnectionsQuery,
  useGetRecipientCredentialsQuery,
  useUpdateCredentialsRequestMutation,
  useAddConnectionMutation,
  useLoginMutation,
  useSignupMutation,
  useGetAllFuelStationsQuery,
  useGetFuelStationByIdQuery,
  useUpdateFuelStationMutation,
  useAddFuelStationDataMutation,
  useDeleteFuelStationMutation,
  useGetAllTransactionHistoryQuery,
  useGetAllRewardHistoryQuery,
  useGetRewardDataQuery,
  useGetUserDataQuery,
  useSendRewardMutation,
  useAddRewardMutation,
  useDeleteUserMutation,
  useEditRewardMutation,
  useDeleteRewardMutation,
  useGetRewardByIdQuery,
  useUpdateUserStatusMutation,
  useGetAllRolesDataQuery,
  useDeleteRoleDataMutation,
  useGetAllRoutesQuery,
  useAddRoleDataMutation,
  useGetRoleByIdQuery,
  useUpdateRoleDataMutation,
  useGetUserByIdQuery,
  useAdminCreateUserMutation,
  useUpdateAdminUserMutation,
} = api;
