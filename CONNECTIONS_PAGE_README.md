# Connections Page - Mobile-Friendly QR Code Flow

A complete React/TypeScript component that handles QR code connections and credential sharing with a mobile-first design.

## Features

### 🎯 **Core Functionality**

- **URL Normalization**: Automatically converts `/connections/:code` to `/connections?code=<code>`
- **QR Code Detection**: Reads code from query parameters or path parameters
- **Credential Sharing**: Share verified credentials with connections
- **Mobile-First Design**: Responsive grid layout optimized for mobile devices

### 📱 **Mobile-Friendly UI**

- Responsive grid layout (1 column on mobile, 2 columns on desktop)
- Touch-friendly buttons and cards
- Proper spacing and typography for mobile screens
- Loading skeletons for smooth UX

### 🔄 **URL Handling**

- **Route Support**: `/connections`, `/connections?code=<code>`, `/connections/:code`
- **Auto-Normalization**: Path params automatically converted to query params
- **Clean Navigation**: Helper function to navigate to clean URLs

## API Integration

### **Required API Endpoints**

1. **GET /users/listAllCredentials**

   ```typescript
   Response: {
     data: {
       credential: Array<{
         id?: string;
         credential_id?: string;
         credentialId?: string;
         document_type: string;
         details?: { document_type: string };
       }>;
     }
   }
   ```

2. **GET /users/getRecipientCredentials**

   ```typescript
   Response: {
     data: {
       requests: Array<{ id: string }>;
     }
   }
   ```

3. **POST /users/updateCredentialsRequest**
   ```typescript
   Payload: {
     credential_request_id: string;
     credentials: Array<{
       credential_id: string;
       document_type: string;
       status: "Active";
       expiry_date: string; // "yyyy-MM-dd"
     }>;
   }
   ```

### **RTK Query Hooks Used**

- `useGetCredentialsQuery()` - Fetch user's verified credentials
- `useGetRecipientCredentialsQuery(recipientId)` - Fetch recipient data
- `useUpdateCredentialsRequestMutation()` - Share credentials

## Document Types

The component displays four document types:

- `DRIVING_LICENSE`
- `AADHAR_CARD`
- `PAN_CARD`
- `PASSPORT`

## Component Structure

### **State Management**

```typescript
// URL normalization state
const [isNormalizing, setIsNormalizing] = useState(false);

// Code extraction
const codeFromQuery = searchParams.get("code");
const codeFromPath = params.code;
const code = codeFromQuery || codeFromPath;
```

### **URL Normalization Logic**

```typescript
useEffect(() => {
  if (codeFromPath && !codeFromQuery && !isNormalizing) {
    setIsNormalizing(true);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("code", codeFromPath);
    setSearchParams(newSearchParams);
    navigate(`/connections?${newSearchParams.toString()}`, { replace: true });
    setIsNormalizing(false);
  }
}, [codeFromPath, codeFromQuery, searchParams, setSearchParams, navigate, isNormalizing]);
```

### **Credential Lookup Map**

```typescript
const verifiedCredentialsMap = useMemo(() => {
  if (!credentialsData?.data?.credential) return {};

  const map: Record<string, Credential> = {};
  credentialsData.data.credential.forEach((cred: Credential) => {
    const docType = cred.document_type || cred.details?.document_type;
    if (docType) {
      map[docType] = cred;
    }
  });
  return map;
}, [credentialsData]);
```

### **Connection ID Resolution**

```typescript
const connectionId = useMemo(() => {
  if (!recipientData?.data?.requests?.length) return null;

  const requests = recipientData.data.requests;

  // If we have a code, find request that contains it
  if (code) {
    const matchingRequest = requests.find((request) => request.id.includes(code));
    if (matchingRequest) return matchingRequest.id;
  }

  // Fallback to first request
  return requests[0]?.id || null;
}, [recipientData, code]);
```

## UI Components

### **Document Cards**

Each document type is displayed as a card with:

- Document name (formatted from snake_case)
- Verified badge (if credential exists)
- Share credentials button (enabled only for verified docs)

### **Loading States**

- Skeleton loading for credentials and recipient data
- Disabled buttons during API calls
- Smooth transitions between states

### **Error Handling**

- Toast notifications for success/error states
- Graceful fallbacks for missing data
- Clear error messages for users

## Usage Examples

### **Basic Usage**

```tsx
import Connections from "@/pages/Connections";

// In your router
<Route path="/connections" element={<Connections />} />
<Route path="/connections/:code" element={<Connections />} />
```

### **QR Code Flow**

1. User scans QR code → `/connections?code=DjGCKfizJkcFe0kBHGNL`
2. Component detects code and fetches recipient data
3. Shows document cards with verified badges
4. User clicks "Share credentials" → API call
5. Success toast notification

### **Deep Link Support**

- `/connections/DjGCKfizJkcFe0kBHGNL` → Auto-normalizes to query param
- `/connections?code=DjGCKfizJkcFe0kBHGNL` → Works directly
- `/connections` → Shows empty state

## Mobile Optimization

### **Responsive Design**

```css
/* Grid layout */
.grid-cols-1 sm:grid-cols-2

/* Touch-friendly buttons */
.w-full h-10

/* Proper spacing */
.p-4 space-y-4
```

### **Mobile-First Features**

- Large touch targets (44px minimum)
- Clear visual hierarchy
- Proper contrast ratios
- Smooth animations
- Loading states for better perceived performance

## Error States

### **API Errors**

- Network errors show destructive toast
- Missing credentials handled gracefully
- Invalid connection IDs show clear messages

### **URL Errors**

- Invalid codes ignored
- Malformed URLs handled safely
- Deep link errors don't break the app

## Testing

### **Manual Testing**

1. Visit `/connections` - Should show empty state
2. Visit `/connections?code=test` - Should show loading then cards
3. Visit `/connections/test` - Should normalize to query param
4. Click "Share credentials" - Should call API and show toast

### **Test Cases**

- ✅ URL normalization works
- ✅ Verified badges show correctly
- ✅ Share buttons only enabled for verified docs
- ✅ API calls with correct payload
- ✅ Success/error toasts
- ✅ Mobile responsive design
- ✅ Loading states
- ✅ Error handling

## Dependencies

- **React Router v6**: `useNavigate`, `useSearchParams`, `useParams`, `useLocation`
- **RTK Query**: API hooks for data fetching
- **ShadCN UI**: Card, Badge, Button, Skeleton components
- **Sonner**: Toast notifications
- **Date-fns**: Date formatting
- **Lucide React**: Icons

## File Structure

```
src/
├── pages/
│   └── Connections.tsx          # Main component
├── components/
│   └── ui/
│       └── badge.tsx           # Badge component
└── App.tsx                     # Updated routes
```

## Production Ready Features

- ✅ TypeScript with proper types
- ✅ Error boundaries and fallbacks
- ✅ Loading states and skeletons
- ✅ Mobile-first responsive design
- ✅ Accessibility considerations
- ✅ Clean code structure
- ✅ Comprehensive error handling
- ✅ Toast notifications
- ✅ URL normalization
- ✅ Deep link support
