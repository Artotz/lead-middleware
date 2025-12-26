import { RequireAuth } from "@/components/RequireAuth";
import HomeClient from "./home-client";

export default function HomePage() {
  return (
    <RequireAuth>
      <HomeClient />
    </RequireAuth>
  );
}
