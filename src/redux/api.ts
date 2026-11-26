import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./base_query_with_reauth";

export interface JourneyField {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  upper?: boolean;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
}

/** what the hosted journey page is told (never any personal data from an earlier step) */
export interface JourneyView {
  journey_id: string;
  status: "created" | "in_progress" | "completed" | "declined" | "expired" | "cancelled";
  business: string;
  purpose: string;
  subject_name: string | null;
  consent: { status: string; notice: { version: string; title: string; text: string; hash: string } };
  steps: { check: string; label: string; status: "pending" | "done"; outcome: "verified" | "not_verified" | null }[];
  current_step: { index: number; check: string; label: string; kind: "form" | "app"; fields: JourneyField[]; waiting_for_app: boolean; link: string | null } | null;
  expires_at: string | null;
  redirect?: string | null;
  mode?: "test";
}

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
    "credentials",
    "activity",
    "familyCredentials",
    "livePhoto",
  ],
  endpoints: (builder) => ({
    getCredentials: builder.query<any, void>({
      query: () => ({
        url: "/users/listAllCredentials",
        method: "GET",
      }),
      providesTags: ["credentials"],
    }),
    createCredential: builder.mutation<
      { status: number; data: { document_id: string }; hasError: boolean; message: string },
      { document_type: string; verifiers_name?: string }
    >({
      query: (body) => ({
        url: "/document/createCredentials",
        method: "POST",
        body,
      }),
    }),
    patchCredentialType: builder.mutation<
      { status: number; hasError: boolean; message: string },
      { session_id: string; document_type: string; started_at?: number }
    >({
      query: (body) => ({
        url: "/document/patchCredentialType",
        method: "POST",
        body,
      }),
      invalidatesTags: ["credentials"],
    }),
    deleteCredential: builder.mutation<{ data: { credential_id: string } }, { credential_id: string }>({
      query: ({ credential_id }) => ({
        url: "/users/deleteCredential",
        method: "POST",
        body: { credential_id },
      }),
      invalidatesTags: ["credentials", "activity", "connections"],
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
      providesTags: ["connections"],
    }),
    getMyActivity: builder.query<
      { data: { activity: Array<{ id: string; type: string; message: string; name?: string; date: number; activity_type?: string }> } },
      void
    >({
      query: () => ({
        url: "/users/activity",
        method: "GET",
      }),
      providesTags: ["activity"],
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
      invalidatesTags: ["connections", "activity"],
    }),
    updateCredentialsRequest: builder.mutation({
      query: ({ credential_request_id, credentials, action, pending_credential_id, family_member_credential_ids }) => ({
        url: "/users/updateCredentialsRequest",
        method: "POST",
        body: {
          credential_request_id,
          credentials,
          ...(action && { action }),
          ...(pending_credential_id && { pending_credential_id }),
          // Always send (even empty) so stale family IDs from a previous check-in are cleared
          ...(Array.isArray(family_member_credential_ids) && { family_member_credential_ids }),
        },
      }),
      invalidatesTags: ["connections", "activity"],
    }),
    updateCheckInStatus: builder.mutation({
      query: ({ credential_request_id, credentials, status, credential_id, cform_data, client_started_at, document_type, family_member_credential_ids }) => ({
        url: "/users/updateCheckInStatus",
        method: "POST",
        body: {
          credential_request_id,
          ...(credentials != null && { credentials }),
          status,
          ...(credential_id != null && credential_id !== "" && { credential_id }),
          ...(cform_data != null && { cform_data }),
          ...(client_started_at != null && { client_started_at }),
          ...(document_type != null && { document_type }),
          // Always send (even empty) so stale family IDs from a previous check-in are cleared
          ...(Array.isArray(family_member_credential_ids) && { family_member_credential_ids }),
        },
      }),
      invalidatesTags: ["connections", "activity"],
    }),
    deleteProfile: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/users/deleteProfile",
        method: "POST",
      }),
    }),
    saveCForm: builder.mutation<
      { success: boolean; message: string },
      { credential_request_id: string; cform_data: Record<string, any> }
    >({
      query: ({ credential_request_id, cform_data }) => ({
        url: "/users/saveCForm",
        method: "POST",
        body: { credential_request_id, cform_data },
      }),
    }),
    saveForeignPassport: builder.mutation<
      { success: boolean; message: string },
      { credential_request_id: string; foreign_passport_data: { passportPhotoUrl: string; visaPhotoUrl: string; selfiePhotoUrl: string } }
    >({
      query: ({ credential_request_id, foreign_passport_data }) => ({
        url: "/users/saveForeignPassport",
        method: "POST",
        body: { credential_request_id, foreign_passport_data },
      }),
    }),
    getFamilyCredentials: builder.query<any, void>({
      query: () => ({
        url: "/users/listFamilyCredentials",
        method: "GET",
      }),
      providesTags: ["familyCredentials"],
    }),
    deleteFamilyCredential: builder.mutation<{ message: string }, { member_id: string }>({
      query: ({ member_id }) => ({
        url: "/users/deleteFamilyCredential",
        method: "POST",
        body: { member_id },
      }),
      invalidatesTags: ["familyCredentials"],
    }),
    updateCredentialHotel: builder.mutation<{ success: boolean }, { credential_id: string; credential_request_id: string }>({
      query: (body) => ({
        url: "/users/updateCredentialHotel",
        method: "POST",
        body,
      }),
    }),
    submitFeedback: builder.mutation<
      { success: boolean; message: string },
      { credential_request_id: string; rating: number; feedback_message?: string }
    >({
      query: (body) => ({
        url: "/users/submitFeedback",
        method: "POST",
        body,
      }),
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

    getHotelPublicInfo: builder.query<
      { hasError: boolean; data: { name: string; logo_url: string | null; businessType?: string | null } | null; message: string },
      string
    >({
      query: (recipient_id) => ({
        url: `/users/public/hotel-info`,
        method: "GET",
        params: { recipient_id },
      }),
    }),
    getVerificationRoutes: builder.query<
      { status: number; data: { routes: Record<string, ("digilocker" | "kwik" | "vsign" | "ovse")[]> }; hasError: boolean; message: string },
      void
    >({
      query: () => ({ url: "/users/verification/routes", method: "GET" }),
    }),
    // ---- a business's verification request: who is asking, and for which document (public: only a name and a document type) ----
    getVerifyRequestInfo: builder.query<
      { status: number; data: { business_name: string | null; document: "aadhaar" | "driving_licence"; status: "pending" | "completed" | "expired" | "cancelled" }; hasError: boolean; message: string },
      string
    >({
      query: (ref) => ({ url: `/verify-public/request/${encodeURIComponent(ref)}`, method: "GET" }),
    }),
    // the signed-in person says a business's request is theirs (so it completes even if they signed up with an email, not a phone)
    claimVerifyRequest: builder.mutation<{ status: number }, string>({
      query: (ref) => ({ url: `/verify-public/request/${encodeURIComponent(ref)}/claim`, method: "POST" }),
    }),
    // ---- a business asks for consent (iVerifi Connect): the person opens a link, reads the notice and agrees, declines or takes it back (no sign-in: the token is the credential) ----
    getConsentInfo: builder.query<
      {
        status: number;
        hasError: boolean;
        message: string;
        data: {
          consent_id: string;
          status: "pending" | "granted" | "declined" | "withdrawn" | "expired";
          business: string;
          purpose: string;
          checks: string[];
          subject_name: string | null;
          notice: { version: string; title: string; text: string; hash: string };
          link_expires_at: string | null;
          valid_until: string | null;
          mode?: "test";
        };
      },
      string
    >({
      query: (token) => ({ url: `/connect-public/consents/${encodeURIComponent(token)}`, method: "GET" }),
    }),
    answerConsent: builder.mutation<{ status: number; message: string; data: { status: string } }, { token: string; action: "grant" | "decline" | "withdraw" }>({
      query: ({ token, action }) => ({ url: `/connect-public/consents/${encodeURIComponent(token)}/${action}`, method: "POST" }),
    }),
    // ---- a hosted journey (iVerifi Suite): the person agrees to the notice and does each step on this page (no sign-in: the token is the credential) ----
    getJourney: builder.query<{ status: number; hasError: boolean; message: string; data: JourneyView }, string>({
      query: (token) => ({ url: `/journey-public/${encodeURIComponent(token)}`, method: "GET" }),
    }),
    answerJourney: builder.mutation<{ status: number; message: string; data: { status: string } }, { token: string; action: "grant" | "decline" }>({
      query: ({ token, action }) => ({ url: `/journey-public/${encodeURIComponent(token)}/answer`, method: "POST", body: { action } }),
    }),
    submitJourneyStep: builder.mutation<
      { status: number; message: string; data: { progress: "next" | "completed" | "waiting_for_app"; link?: string; redirect?: string | null; journey: JourneyView } },
      { token: string; fields: Record<string, string> }
    >({
      query: ({ token, fields }) => ({ url: `/journey-public/${encodeURIComponent(token)}/step`, method: "POST", body: { fields } }),
    }),
    // ---- typed-number checks (PAN, passport, voter ID, mobile OTP) ----
    vsignVerify: builder.mutation<
      { status: number; data: { document_id: string; document_type: string; masked_id: string | null }; hasError: boolean; message: string },
      { document_type: string; id_number: string; dob?: string; family_nickname?: string }
    >({
      query: (body) => ({ url: "/users/vsign/verify", method: "POST", body }),
      invalidatesTags: ["credentials", "activity", "connections"],
    }),
    // ---- a business's hosted Aadhaar request (/a/<token>): no sign-in, the token is the credential ----
    getAadhaarRequest: builder.query<
      { status: number; data: { business_name: string | null; document: "aadhaar"; state: "pending" | "shared" | "failed" | "expired" | "cancelled"; notice: string }; hasError: boolean; message: string },
      string
    >({
      query: (token) => ({ url: `/aadhaar-public/${encodeURIComponent(token)}`, method: "GET" }),
    }),
    startAadhaarRequest: builder.mutation<
      { status: number; data: { session_id: string; qr_url: string; qr_image: string | null; expires_in: number }; hasError: boolean; message: string },
      string
    >({
      query: (token) => ({ url: `/aadhaar-public/${encodeURIComponent(token)}/start`, method: "POST", body: {} }),
    }),
    aadhaarRequestStatus: builder.query<
      { status: number; data: { state: "pending" | "shared" | "failed" | "expired" | "cancelled"; reason?: string; message?: string }; hasError: boolean; message: string },
      string
    >({
      query: (token) => ({ url: `/aadhaar-public/${encodeURIComponent(token)}/status`, method: "GET" }),
    }),
    // ---- Aadhaar through the Aadhaar App (offline verification) ----
    ovseStart: builder.mutation<
      { status: number; data: { session_id: string; qr_url: string; qr_image: string | null; expires_in: number }; hasError: boolean; message: string },
      void
    >({
      query: () => ({ url: "/users/ovse/start", method: "POST", body: {} }),
    }),
    ovseStatus: builder.query<
      { status: number; data: { session_id: string; status: "pending" | "processing" | "completed" | "failed" | "expired" | "replaced"; reason?: string; message?: string; document_id?: string }; hasError: boolean; message: string },
      string
    >({
      query: (id) => ({ url: `/users/ovse/${encodeURIComponent(id)}/status`, method: "GET" }),
      providesTags: ["credentials"],
    }),
    vsignMobileSend: builder.mutation<
      { status: number; data: { request_id: string; expires_in: number }; hasError: boolean; message: string },
      { mobile: string }
    >({
      query: (body) => ({ url: "/users/vsign/mobile/send", method: "POST", body }),
    }),
    vsignMobileVerify: builder.mutation<
      { status: number; data: { document_id: string }; hasError: boolean; message: string },
      { request_id: string; otp: string }
    >({
      query: (body) => ({ url: "/users/vsign/mobile/verify", method: "POST", body }),
      invalidatesTags: ["credentials", "activity", "connections"],
    }),
    // ---- live photo (a current picture of the person, taken after a document is verified) ----
    getLivePhotoStatus: builder.query<
      {
        status: number;
        data: {
          has_live_photo: boolean;
          expired: boolean;
          required: boolean;
          captured_at: number | null;
          expires_at: number | null;
          valid_days: number;
          /** how many of the person's documents have not been checked against the current live photo yet */
          documents_to_check: number;
          /** the exact consent wording to show (written on the server, so what is recorded is what the person saw) */
          consent: { version: string; title: string; paragraphs: string[]; checkbox: string };
        };
      },
      void
    >({
      query: () => ({ url: "/users/live-photo/status", method: "GET" }),
      providesTags: ["livePhoto"],
    }),
    createLivePhotoChallenge: builder.mutation<
      { status: number; data: { challenge_id: string; steps: ("straight" | "blink" | "turn_left" | "turn_right")[]; expires_in_s: number } },
      void
    >({
      query: () => ({ url: "/users/live-photo/challenge", method: "POST" }),
    }),
    submitLivePhoto: builder.mutation<
      { status: number; data: { photo_id: string; captured_at: number; expires_at: number } },
      {
        challenge_id: string;
        consent: true;
        consent_version: string;
        steps: { action: "straight" | "blink" | "turn_left" | "turn_right"; passed: boolean; frames: string[] }[];
        photo_frames: string[];
        crop: string;
      }
    >({
      query: (body) => ({ url: "/users/live-photo/submit", method: "POST", body }),
      invalidatesTags: ["livePhoto"],
    }),
    bindLivePhotoDocuments: builder.mutation<{ status: number; data: { checked: number; results: { credential_id: string; document_type: string | null; decision: string }[] } }, void>({
      query: () => ({ url: "/users/live-photo/bind", method: "POST" }),
      invalidatesTags: ["credentials", "livePhoto"],
    }),
    confirmDocumentPhoto: builder.mutation<{ status: number; data: { credential_id: string; is_me: boolean; date: string } }, { credential_id: string; is_me: boolean }>({
      query: (body) => ({ url: "/users/live-photo/confirm-document", method: "POST", body }),
      invalidatesTags: ["credentials"],
    }),
    getLivePhotoImage: builder.query<{ status: number; data: { image: string } }, void>({
      query: () => ({ url: "/users/live-photo/image", method: "GET" }),
      providesTags: ["livePhoto"],
    }),
    deleteLivePhoto: builder.mutation<{ status: number; message: string }, void>({
      query: () => ({ url: "/users/live-photo", method: "DELETE" }),
      invalidatesTags: ["livePhoto"],
    }),
    markKycStarted: builder.mutation<
      { hasError: boolean; message: string },
      { credential_request_id: string; session_id: string; document_type: string }
    >({
      query: (body) => ({
        url: "/users/markKycStarted",
        method: "POST",
        body,
      }),
    }),
  }),
});
export const {
  useGetCredentialsQuery,
  useGetVerificationRoutesQuery,
  useVsignVerifyMutation,
  useVsignMobileSendMutation,
  useOvseStartMutation,
  useGetAadhaarRequestQuery,
  useStartAadhaarRequestMutation,
  useLazyAadhaarRequestStatusQuery,
  useLazyOvseStatusQuery,
  useVsignMobileVerifyMutation,
  useGetVerifyRequestInfoQuery,
  useClaimVerifyRequestMutation,
  useGetConsentInfoQuery,
  useGetJourneyQuery,
  useAnswerJourneyMutation,
  useSubmitJourneyStepMutation,
  useAnswerConsentMutation,
  useGetLivePhotoStatusQuery,
  useCreateLivePhotoChallengeMutation,
  useSubmitLivePhotoMutation,
  useBindLivePhotoDocumentsMutation,
  useConfirmDocumentPhotoMutation,
  useGetLivePhotoImageQuery,
  useDeleteLivePhotoMutation,
  useCreateCredentialMutation,
  usePatchCredentialTypeMutation,
  useDeleteCredentialMutation,
  useSaveCFormMutation,
  useSaveForeignPassportMutation,
  useGetConnectionsQuery,
  useGetRecipientCredentialsQuery,
  useGetMyActivityQuery,
  useUpdateCredentialsRequestMutation,
  useUpdateCheckInStatusMutation,
  useDeleteProfileMutation,
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
  useSubmitFeedbackMutation,
  useGetFamilyCredentialsQuery,
  useDeleteFamilyCredentialMutation,
  useUpdateCredentialHotelMutation,
  useGetHotelPublicInfoQuery,
  useMarkKycStartedMutation,
} = api;
