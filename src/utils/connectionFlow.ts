export const saveRecipientIdForLater = (recipientId: string) => {
  localStorage.setItem("pendingRecipientId", recipientId);
};

export const getRecipientIdFromStorage = () => {
  const id = localStorage.getItem("pendingRecipientId");
  localStorage.removeItem("pendingRecipientId");
  return id;
};
