import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGetCredentialsQuery } from "@/redux/api";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const formatDocType = (type: string): string => {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
};

const Documents = () => {
  const navigate = useNavigate();

  const { data: credData, isLoading: isLoadingCreds } =
    useGetCredentialsQuery();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const documents = credData?.data?.credential || [];

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Documents</h2>
      <div className="flex justify-end">
        <Button onClick={() => navigate("/add-documents")}>Add Document</Button>
      </div>

      {isLoadingCreds ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array(3)
            .fill(0)
            .map((_, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {documents.map((doc: any, idx: number) => (
            <Dialog key={idx}>
              <DialogTrigger asChild>
                <Card
                  className="cursor-pointer hover:shadow-md"
                  onClick={() =>
                    setSelectedImage(doc.images?.[0].url_org || null)
                  }
                >
                  <CardHeader>
                    <CardTitle>
                      {doc.document_type
                        ? formatDocType(doc.document_type)
                        : "Document"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground truncate">
                      Click to preview
                    </p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogTitle>{doc.document_type || "Document"}</DialogTitle>
                <img
                  src={selectedImage || ""}
                  alt="Document"
                  className="w-full rounded-md"
                />
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
};

export default Documents;
