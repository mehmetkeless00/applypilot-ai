import { Spinner } from "@/components/ui/Spinner";

export default function DashboardLoading() {
  return (
    <div className="flex justify-center py-24">
      <Spinner className="size-6 text-indigo-600" />
    </div>
  );
}
