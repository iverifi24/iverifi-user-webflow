/**
 * Helper function to determine connection type based on code
 * You can customize this logic based on your business requirements
 */
export const determineConnectionType = (code: string): "Company" | "Individual" => {
  // You can implement your own logic here to determine the type
  // For example, based on code format, prefix, or make an API call

  // Example logic - you can customize this based on your needs:
  if (code.startsWith("COMP_")) {
    return "Company";
  } else if (code.startsWith("IND_")) {
    return "Individual";
  }

  // Default to Company if no specific pattern is found
  return "Company";
};

/**
 * Validates if a code parameter is present and has a valid format
 */
export const isValidQRCode = (code: string | null): boolean => {
  if (!code) return false;

  // Add your validation logic here
  // For example, check if it matches a specific pattern
  return code.length > 0;
};
