import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetConnectionsQuery, useGetCredentialsQuery } from "@/redux/api";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();
  const { data: credData, isLoading: isLoadingCreds } =
    useGetCredentialsQuery();
  const { data: connectionData, isLoading: isLoadingConnections } =
    useGetConnectionsQuery();

  const isLoading = isLoadingCreds || isLoadingConnections;

  const cards = [
    {
      title: "Documents",
      value: credData?.data?.credential?.length || 0,
      route: "/documents",
    },
    {
      title: "Connections",
      value: connectionData?.data?.requests?.length || 0,
      route: "/connections",
    },
  ];

  //   console.log("Credentials Data:", credData);
  console.log("Connections Data:", connectionData);

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {isLoading
          ? Array(2)
              .fill(0)
              .map((_, index) => (
                <Card key={index}>
                  <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20" />
                  </CardContent>
                </Card>
              ))
          : cards.map((card, index) => (
              <Card
                key={index}
                className="cursor-pointer transition hover:shadow-md"
                onClick={() => navigate(card.route)}
              >
                <CardHeader>
                  <CardTitle>{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
};

export default HomePage;
