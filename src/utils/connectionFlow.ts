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