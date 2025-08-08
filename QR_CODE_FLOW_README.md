# QR Code Authentication Flow

This implementation provides a complete QR code authentication flow that handles both authenticated and unauthenticated users.

## Overview

The QR code flow works as follows:

### Case 1: User Not Logged In

- User opens a QR code URL with a `code` parameter (e.g., `https://yourapp.com/home?code=COMP_12345`)
- System detects user is not authenticated
- Automatically redirects to `/signup?code=COMP_12345`
- After successful login/signup, the system redirects to `/connections?code=COMP_12345`
- The connections page detects the code parameter and calls the API
- After successful API call, navigates to `/connections/COMP_12345`

### Case 2: User Already Logged In

- User opens a QR code URL with a `code` parameter
- System detects user is authenticated
- Immediately redirects to `/connections?code=COMP_12345`
- The connections page detects the code parameter and calls the API
- After successful API call, navigates to `/connections/COMP_12345`

## Components

### 1. QRCodeHandler (`src/components/qr-code-handler.tsx`)

The main component that wraps your entire app and handles QR code URLs from any route.

**Features:**

- Detects `code` parameter in URL
- Handles authentication state
- Redirects unauthenticated users to login
- Redirects authenticated users to connections page
- Error handling and navigation

### 2. Updated LoginForm (`src/components/login-form.tsx`)

Enhanced login form that reads the `code` parameter after successful authentication.

**Features:**

- Reads `code` from URL after login
- Redirects to connections page with code parameter
- Maintains existing login functionality
- Error handling

### 3. Updated ConnectionsRouter (`src/screens/connections/connections_router.tsx`)

Enhanced connections page that handles QR code API calls.

**Features:**

- Detects `code` parameter in URL
- Calls the API with the code
- Navigates to `/connections/{code}` after success
- Handles both authenticated and unauthenticated cases
- Error handling

### 4. QR Code Utils (`src/utils/qr-code-utils.ts`)

Shared utility functions for QR code processing.

**Functions:**

- `determineConnectionType(code)`: Determines if code is for "Company" or "Individual"
- `isValidQRCode(code)`: Validates QR code format

## Usage

### 1. Add QRCodeHandler to Your App

```tsx
// src/App.tsx
import { QRCodeHandler } from "./components/qr-code-handler";

const App = () => {
  return (
    <Router>
      <QRCodeHandler>
        <Routes>{/* Your existing routes */}</Routes>
      </QRCodeHandler>
    </Router>
  );
};
```

### 2. Customize Type Determination

Edit `src/utils/qr-code-utils.ts` to implement your business logic:

```tsx
export const determineConnectionType = (code: string): "Company" | "Individual" => {
  // Your custom logic here
  if (code.startsWith("COMP_")) {
    return "Company";
  } else if (code.startsWith("IND_")) {
    return "Individual";
  }

  return "Company"; // Default
};
```

### 3. Customize Validation

```tsx
export const isValidQRCode = (code: string | null): boolean => {
  if (!code) return false;

  // Add your validation logic
  return code.length > 0 && code.includes("_");
};
```

## API Integration

The system uses your existing `useAddConnectionMutation` from Redux in the connections page:

```tsx
await addConnection({
  document_id: code,
  type, // "Company" or "Individual"
}).unwrap();
```

## Testing

### Test URLs

Use these URLs to test the flow:

1. **Company QR Code (Authenticated)**: `https://yourapp.com/home?code=COMP_12345`
2. **Individual QR Code (Authenticated)**: `https://yourapp.com/home?code=IND_67890`
3. **Company QR Code (Unauthenticated)**: `https://yourapp.com/signup?code=COMP_12345`

### Example Component

Use `QRCodeExample` component for testing:

```tsx
import { QRCodeExample } from "@/components/qr-code-example";

// Add to any page for testing
<QRCodeExample />;
```

## Flow Diagram

```
User opens QR code URL
         ↓
    Check auth state
         ↓
┌─────────────────┐
│   Authenticated? │
└─────────────────┘
         ↓
    Yes        No
     ↓         ↓
Redirect to   Redirect to
/connections?  /signup?code=xxx
code=xxx       ↓
     ↓      User logs in
API call in    ↓
connections    Redirect to
page          /connections?code=xxx
     ↓              ↓
Navigate to    API call in
/connections/  connections page
{code}         ↓
               Navigate to /connections/{code}
```

## Error Handling

- Invalid QR codes are ignored
- API errors are logged and code parameter is removed
- Authentication errors are logged
- Network errors are handled gracefully
- Code parameter is removed on error to prevent infinite retries

## Customization

### 1. Change Default Type

Modify the default return in `determineConnectionType()`.

### 2. Add More Validation

Enhance `isValidQRCode()` with your business rules.

### 3. Custom Error Handling

Add toast notifications or custom error pages.

### 4. Different Navigation

Modify the navigation logic in both components.

## Dependencies

- React Router (useNavigate, useSearchParams)
- Your existing auth context
- Your existing Redux API setup
- TypeScript for type safety

## Security Considerations

- Always validate QR codes before processing
- Sanitize code parameters
- Handle API errors gracefully
- Consider rate limiting for API calls
- Log suspicious activity

## Troubleshooting

### Common Issues

1. **Code not being read after login**

   - Check that `useSearchParams` is working
   - Verify the code parameter is preserved in URL

2. **API not being called**

   - Check Redux store setup
   - Verify `useAddConnectionMutation` is imported correctly

3. **Infinite redirects**

   - Check authentication state loading
   - Verify redirect conditions

4. **Code parameter not being removed**
   - Check that `setSearchParams` is working correctly
   - Verify the useEffect dependencies

### Debug Mode

Add console logs to track the flow:

```tsx
console.log("QR Code Handler:", { code, isAuthenticated, loading });
console.log("Connections Router:", { code, searchParams });
```

## Files Modified

1. `src/App.tsx` - Added QRCodeHandler wrapper
2. `src/components/qr-code-handler.tsx` - Updated to redirect to connections page
3. `src/components/login-form.tsx` - Updated to redirect to connections page
4. `src/screens/connections/connections_router.tsx` - Added QR code handling logic
5. `src/utils/qr-code-utils.ts` - New utility functions
6. `src/components/qr-code-example.tsx` - Example component for testing
