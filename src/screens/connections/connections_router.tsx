import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetConnectionsQuery, useAddConnectionMutation } from "@/redux/api";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { determineConnectionType, isValidQRCode } from "@/utils/qr-code-utils";
import AddConnectionModal from "./add_connection";

const formatDocType = (type: string): string => {
  return type
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
};

const ConnectionsRouter = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addConnection] = useAddConnectionMutation();

  const { data: connectionData, isLoading: isLoadingConnections } = useGetConnectionsQuery();

  const connections = connectionData?.data?.requests || [];

  // Handle QR code flow
  useEffect(() => {
    const code = searchParams.get("code");

    if (isValidQRCode(code)) {
      const handleQRCodeConnection = async () => {
        try {
          const type = determineConnectionType(code!);

          await addConnection({
            document_id: code!,
            type,
          }).unwrap();

          // Navigate to the connection details page with the code as path parameter
          navigate(`/connections/${code}`);
        } catch (error) {
          console.error("Error adding connection from QR code:", error);
          // Remove the code parameter on error to prevent infinite retries
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete("code");
          setSearchParams(newSearchParams);
        }
      };

      handleQRCodeConnection();
    }
  }, [searchParams, addConnection, navigate, setSearchParams]);

  // const getExpiryInfo = (expiry: string) => {
  //   if (!expiry) return { status: "Unknown", label: "No expiry date" };

  //   const expiryDate = parseISO(expiry);
  //   return isPast(expiryDate)
  //     ? { status: "Expired", label: "Expired" }
  //     : {
  //         status: "Active",
  //         label: `${formatDistanceToNowStrict(expiryDate, {
  //           unit: "day",
  //         })} remaining`,
  //       };
  // };

  const formatSharedDate = (timestamp: string | number) => {
    try {
      const date = new Date(Number(timestamp));
      return format(date, "MMM d, yyyy");
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Your Connections</h2>
      <div className="flex justify-end">
        {/* <Button onClick={() => navigate("/connections/add")}>
          Add Connection
        </Button> */}
        <AddConnectionModal />
      </div>

      {isLoadingConnections ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array(3)
            .fill(0)
            .map((_, idx) => (
              <Card key={idx} className="p-4">
                <Skeleton className="h-6 w-1/2 mb-3" />
                <Separator className="mb-3" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </Card>
            ))}
        </div>
      ) : connections.length === 0 ? (
        <p className="text-muted-foreground text-sm border p-4 rounded-md bg-muted/50">
          You don't have any active connections.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {connections.map((conn: any, idx: number) => {
            const sharedDate = formatSharedDate(conn.created_at_timestamp);

            return (
              <Card
                key={idx}
                className="hover:shadow-md transition cursor-pointer border-muted"
                onClick={() => {
                  navigate(`/connections/${conn.recipient_id}`, {
                    state: { connection: conn },
                  });
                }}
              >
                <CardHeader>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recipient</p>
                  <CardTitle className="text-lg mt-0.5">
                    {conn.recipients?.name ||
                      conn.recipients?.firstName ||
                      conn.recipients?.hotel_name ||
                      conn.recipients?.businessName ||
                      "Your Stay"}
                  </CardTitle>
                </CardHeader>

                <Separator />

                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Documents Shared:</span>
                    <span>{conn.shared_documents_count || 1}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-medium">Shared on:</span>
                    <span>{sharedDate}</span>
                  </div>

                  {/* <div className="flex justify-between">
                    <span className="font-medium">Expires In:</span>
                    <span>{expiryLabel}</span>
                  </div> */}

                  {/* <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span
                      className={
                        status === "Expired"
                          ? "text-red-500 font-medium"
                          : "text-green-600 font-medium"
                      }
                    >
                      {status}
                    </span>
                  </div> */}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConnectionsRouter;
