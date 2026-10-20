"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/flight/ui/tabs";

export function ClubSettingsTabs({
  initial,
  showTraining,
  club,
  training,
}: {
  initial: "club" | "training";
  showTraining: boolean;
  club: ReactNode;
  training: ReactNode;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initial);
  if (!showTraining) return club;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = value === "training" ? "training" : "club";
        setTab(next);
        router.replace(next === "training" ? "/admin/settings?tab=training" : "/admin/settings", { scroll: false });
      }}
      className="gap-6"
    >
      <TabsList variant="line" aria-label="Club settings">
        <TabsTrigger value="club">Club</TabsTrigger>
        <TabsTrigger value="training">Training programmes</TabsTrigger>
      </TabsList>
      <TabsContent value="club">{club}</TabsContent>
      <TabsContent value="training">{training}</TabsContent>
    </Tabs>
  );
}
