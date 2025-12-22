import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import HomeClient from "./home-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <HomeClient consultor={user.name} />;
}
