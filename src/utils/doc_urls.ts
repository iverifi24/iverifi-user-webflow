export const getUploadUrl = (docType: string): string => {
  switch (docType) {
    case "AADHAR_CARD":
      return "/upload/aadhar";
    case "PAN_CARD":
      return "/upload/pan";
    case "DRIVING_LICENSE":
      return "/upload/driving-license";
    case "PASSPORT":
      return "/upload/passport";
    default:
      return `/upload?docType=${docType}`;
  }
};
