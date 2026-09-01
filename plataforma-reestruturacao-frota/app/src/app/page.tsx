import { getBranchOptions, getCases, getClientOptions } from "@/lib/data";
import { DashboardClient } from "@/components/DashboardClient";

export default async function Home() {
  const [cases, clients, branches] = await Promise.all([
    getCases(),
    getClientOptions(),
    getBranchOptions(),
  ]);

  return <DashboardClient cases={cases} clients={clients} branches={branches} />;
}
