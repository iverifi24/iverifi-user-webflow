// ── Guest check-in funnel (sessionStorage — tab-scoped, clears on tab close) ──

export const guestCheckin = {
  setHotelCode: (v: string) => sessionStorage.setItem('guestCheckin_hotelCode', v),
  getHotelCode: () => sessionStorage.getItem('guestCheckin_hotelCode') ?? '',
  setHotelName: (v: string) => sessionStorage.setItem('guestCheckin_hotelName', v),
  getHotelName: () => sessionStorage.getItem('guestCheckin_hotelName') ?? '',
  setConnectionId: (v: string) => sessionStorage.setItem('guestCheckin_connectionId', v),
  getConnectionId: () => sessionStorage.getItem('guestCheckin_connectionId') ?? '',
  setCredentialId: (v: string) => sessionStorage.setItem('guestCheckin_credentialId', v),
  getCredentialId: () => sessionStorage.getItem('guestCheckin_credentialId') ?? '',
  setStartedAt: (v: number) => sessionStorage.setItem('guestCheckin_startedAt', String(v)),
  getStartedAt: () => Number(sessionStorage.getItem('guestCheckin_startedAt') ?? 0),
  setSelectedCredential: (v: object) => sessionStorage.setItem('guestCheckin_selectedCredential', JSON.stringify(v)),
  getSelectedCredential: (): object | null => {
    try { return JSON.parse(sessionStorage.getItem('guestCheckin_selectedCredential') ?? 'null'); }
    catch { return null; }
  },
  clear: () => {
    ['hotelCode', 'hotelName', 'connectionId', 'credentialId', 'startedAt', 'selectedCredential'].forEach(
      (k) => sessionStorage.removeItem(`guestCheckin_${k}`)
    );
  },
};

export const saveRecipientIdForLater = (recipientId: string) => {
  localStorage.setItem("pendingRecipientId", recipientId);
};

export const getRecipientIdFromStorage = () => {
  const id = localStorage.getItem("pendingRecipientId");
  localStorage.removeItem("pendingRecipientId");
  return id;
};

export const peekRecipientIdFromStorage = () => {
  return localStorage.getItem("pendingRecipientId");
};

/** Clear the pending connection code from storage (e.g. after user has clicked Check In so they must scan again to return). */
export const clearPendingRecipientId = () => {
  localStorage.removeItem("pendingRecipientId");
  localStorage.removeItem("pendingIsHrRequest");
};

/**
 * Stamped by ProtectedRoute when it redirects an unauthenticated visitor to
 * /login *from* /hr-request (the non-hotel employer-request entry point,
 * see screens/hr-request/hr_request_entry.tsx) - distinguishes that case
 * from the hotel QR/deep-link funnel, which also saves a pending code but
 * expects to land back on "/" afterward. Survives across intermediate hops
 * (complete-profile, accept-terms) since only getPostConnectPath below ever
 * consumes it.
 */
export const saveIsHrRequestForLater = () => {
  localStorage.setItem("pendingIsHrRequest", "1");
};

/**
 * Where to actually send the candidate once their pending connection code
 * has been used (login/signup/terms-acceptance/profile-completion all
 * converge here after connecting) - "/" is correct for the hotel funnel
 * (Connections.tsx has its own ?code= effect for that), but a /hr-request
 * visitor needs to land back on /hr-request itself: QRCodeHandler sweeps
 * any other path's ?code= straight into /checkin (see its excludedPaths),
 * which is exactly the bug this exists to avoid. Consumes (clears) the
 * flag ProtectedRoute stamped - call this only at the point you're actually
 * about to navigate the candidate to their final destination, not at an
 * intermediate hop.
 */
export const getPostConnectPath = (code: string | null) => {
  const isHrRequest = localStorage.getItem("pendingIsHrRequest") === "1";
  localStorage.removeItem("pendingIsHrRequest");
  if (!code) return "/";
  return isHrRequest ? `/hr-request?code=${code}` : `/?code=${code}`;
};