import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/loading-screen";
import { useGetConnectionsQuery } from "@/redux/api";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();
  const { data: connectionData, isLoading } =
    useGetConnectionsQuery();

  const cards = [
    {
      title: "Connections",
      value: connectionData?.data?.requests?.length || 0,
      route: "/connections",
    },
  ];


  return (
    <div className="p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {isLoading
          ? <LoadingScreen variant="cards" cardCount={1} gridCols="1" />
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
