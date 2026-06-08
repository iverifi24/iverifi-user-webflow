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
  clear: () => {
    ['hotelCode', 'hotelName', 'connectionId', 'credentialId', 'startedAt'].forEach(
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
};