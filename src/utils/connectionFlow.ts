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