"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/flight/ui/tabs";

type SettingsTab = "club" | "training" | "ccat";

export function ClubSettingsTabs({
  initial,
  club,
  training,
  ccat,
}: {
  initial: SettingsTab;
  club: ReactNode;
  training: ReactNode | null;
  ccat: ReactNode | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>(initial);
  if (!training && !ccat) return club;

  function select(value: string) {
    const next: SettingsTab = value === "training" && training ? "training" : value === "ccat" && ccat ? "ccat" : "club";
    setTab(next);
    const href = next === "club" ? "/admin/settings" : `/admin/settings?tab=${next}`;
    router.replace(href, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={select} className="gap-6">
      <TabsList variant="line" aria-label="Club settings">
        <TabsTrigger value="club">Club</TabsTrigger>
        {training ? <TabsTrigger value="training">Training programmes</TabsTrigger> : null}
        {ccat ? <TabsTrigger value="ccat">C Cat syllabus</TabsTrigger> : null}
      </TabsList>
      <TabsContent value="club">{club}</TabsContent>
      {training ? <TabsContent value="training">{training}</TabsContent> : null}
      {ccat ? <TabsContent value="ccat">{ccat}</TabsContent> : null}
    </Tabs>
  );
}
