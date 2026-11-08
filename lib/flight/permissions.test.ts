import { describe, expect, it } from "vitest";

import {
  PERMISSIONS,
  hasPermission,
  type AccessSubject,
  type Permission,
} from "@/lib/flight/permissions";

const member: AccessSubject = { flightRole: "member", safetyAdmin: false };
const instructor: AccessSubject = { flightRole: "instructor", safetyAdmin: false };
const flightAdmin: AccessSubject = { flightRole: "admin", safetyAdmin: false };
const safetyOnly: AccessSubject = { flightRole: null, safetyAdmin: true };
const safetyMember: AccessSubject = { flightRole: "member", safetyAdmin: true };

/**
 * Expected grants. A new permission has to be added here or the test fails,
 * which keeps the catalog from drifting silently.
 */
const grants: Record<Permission, Record<"member" | "instructor" | "flightAdmin" | "safetyOnly" | "safetyMember", boolean>> = {
  "flights.read": { member: true, instructor: true, flightAdmin: true, safetyOnly: false, safetyMember: true },
  "profile.update": { member: true, instructor: true, flightAdmin: true, safetyOnly: false, safetyMember: true },
  "authorisations.review": { member: false, instructor: true, flightAdmin: true, safetyOnly: false, safetyMember: false },
  "authorisations.approve": { member: false, instructor: true, flightAdmin: true, safetyOnly: false, safetyMember: false },
  "authorisations.archive": { member: false, instructor: false, flightAdmin: true, safetyOnly: false, safetyMember: false },
  "training.record": { member: false, instructor: true, flightAdmin: true, safetyOnly: false, safetyMember: false },
  "training.manage": { member: false, instructor: false, flightAdmin: true, safetyOnly: false, safetyMember: false },
  "fleet.manage": { member: false, instructor: false, flightAdmin: true, safetyOnly: false, safetyMember: false },
  "instructors.manage": { member: false, instructor: false, flightAdmin: true, safetyOnly: false, safetyMember: false },
  "forms.manage": { member: false, instructor: false, flightAdmin: true, safetyOnly: false, safetyMember: false },
  "members.manage": { member: false, instructor: false, flightAdmin: true, safetyOnly: true, safetyMember: true },
  "club.settings": { member: false, instructor: false, flightAdmin: true, safetyOnly: true, safetyMember: true },
  "safety.manage": { member: false, instructor: false, flightAdmin: false, safetyOnly: true, safetyMember: true },
  "briefing.tv": { member: false, instructor: false, flightAdmin: false, safetyOnly: true, safetyMember: true },
  "traffic.read": { member: false, instructor: false, flightAdmin: true, safetyOnly: false, safetyMember: false },
};

describe("hasPermission", () => {
  it("covers every permission in the catalog", () => {
    expect(Object.keys(grants).sort()).toEqual([...PERMISSIONS].sort());
  });

  it("matches the role matrix and denies by default", () => {
    const subjects = { member, instructor, flightAdmin, safetyOnly, safetyMember };
    for (const permission of PERMISSIONS) {
      for (const [name, subject] of Object.entries(subjects) as [
        keyof typeof subjects,
        AccessSubject,
      ][]) {
        expect(hasPermission(subject, permission), `${name} ${permission}`).toBe(
          grants[permission][name],
        );
      }
    }
  });

  it("does not let a safety admin inherit flight admin", () => {
    expect(hasPermission(safetyOnly, "fleet.manage")).toBe(false);
    expect(hasPermission(safetyOnly, "authorisations.approve")).toBe(false);
    expect(hasPermission(flightAdmin, "safety.manage")).toBe(false);
  });

  it("denies a signed-out subject", () => {
    const guest: AccessSubject = { flightRole: null, safetyAdmin: false };
    for (const permission of PERMISSIONS) {
      expect(hasPermission(guest, permission)).toBe(false);
    }
  });
});
