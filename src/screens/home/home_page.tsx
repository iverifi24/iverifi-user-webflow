import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/loading-screen";
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
          ? <LoadingScreen variant="cards" cardCount={2} gridCols="2" />
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
