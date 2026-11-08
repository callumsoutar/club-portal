import { redirect } from "next/navigation";

export default async function LegacyInstructorStudentPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  redirect(`/training/enrolments/${userId}`);
}
