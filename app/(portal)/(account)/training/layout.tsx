import { TrainingNav } from "@/components/ccat/training-nav";
import { requireUser } from "@/lib/flight/auth";

export default async function TrainingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <TrainingNav role={user.profile.role} />
      {children}
    </div>
  );
}
