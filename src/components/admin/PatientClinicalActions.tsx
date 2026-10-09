"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";

type Props = {
  patientId: string;
};

export function PatientClinicalActions({ patientId }: Props) {
  const router = useRouter();
  const [allergyOpen, setAllergyOpen] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [allergyName, setAllergyName] = useState("");
  const [allergySeverity, setAllergySeverity] = useState("");
  const [allergyNotes, setAllergyNotes] = useState("");

  const [conditionName, setConditionName] = useState("");
  const [conditionStatus, setConditionStatus] = useState("ACTIVE");
  const [conditionNotes, setConditionNotes] = useState("");

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [encounterNotes, setEncounterNotes] = useState("");
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [weight, setWeight] = useState("");

  function refresh() {
    router.refresh();
  }

  async function saveAllergy(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/admin/patients/${patientId}/allergies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: allergyName,
        severity: allergySeverity,
        notes: allergyNotes,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not add allergy");
      return;
    }
    toast.success("Allergy added");
    setAllergyOpen(false);
    setAllergyName("");
    setAllergySeverity("");
    setAllergyNotes("");
    refresh();
  }

  async function saveCondition(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/admin/patients/${patientId}/conditions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: conditionName,
        status: conditionStatus,
        notes: conditionNotes,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not add condition");
      return;
    }
    toast.success("Condition added");
    setConditionOpen(false);
    setConditionName("");
    setConditionStatus("ACTIVE");
    setConditionNotes("");
    refresh();
  }

  async function saveEncounter(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const vitalsJson: Record<string, string> = {};
    if (bp.trim()) vitalsJson.bp = bp.trim();
    if (pulse.trim()) vitalsJson.pulse = pulse.trim();
    if (temp.trim()) vitalsJson.temperature = temp.trim();
    if (weight.trim()) vitalsJson.weight = weight.trim();

    const res = await fetch(`/api/admin/patients/${patientId}/encounters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chiefComplaint,
        notes: encounterNotes,
        vitalsJson: Object.keys(vitalsJson).length ? vitalsJson : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not add encounter");
      return;
    }
    toast.success("Encounter recorded");
    setEncounterOpen(false);
    setChiefComplaint("");
    setEncounterNotes("");
    setBp("");
    setPulse("");
    setTemp("");
    setWeight("");
    refresh();
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={adminPrimaryButtonClassName(
            "h-8 bg-white px-3 text-sm text-[#1a1a1a] ring-1 ring-[#e3e3e3] hover:bg-[#fafafa] hover:opacity-100"
          )}
          onClick={() => setAllergyOpen(true)}
        >
          Add allergy
        </button>
        <button
          type="button"
          className={adminPrimaryButtonClassName(
            "h-8 bg-white px-3 text-sm text-[#1a1a1a] ring-1 ring-[#e3e3e3] hover:bg-[#fafafa] hover:opacity-100"
          )}
          onClick={() => setConditionOpen(true)}
        >
          Add condition
        </button>
        <button
          type="button"
          className={adminPrimaryButtonClassName(
            "h-8 bg-white px-3 text-sm text-[#1a1a1a] ring-1 ring-[#e3e3e3] hover:bg-[#fafafa] hover:opacity-100"
          )}
          onClick={() => setEncounterOpen(true)}
        >
          Add encounter
        </button>
      </div>

      <AdminFormDialog
        open={allergyOpen}
        onOpenChange={setAllergyOpen}
        title="Add allergy"
        description="Record a known patient allergy."
      >
        <form onSubmit={saveAllergy} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="allergy-name">Allergy</Label>
            <Input
              id="allergy-name"
              required
              value={allergyName}
              onChange={(e) => setAllergyName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="allergy-severity">Severity</Label>
            <Input
              id="allergy-severity"
              value={allergySeverity}
              onChange={(e) => setAllergySeverity(e.target.value)}
              placeholder="Mild / Moderate / Severe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="allergy-notes">Notes</Label>
            <Textarea
              id="allergy-notes"
              rows={2}
              value={allergyNotes}
              onChange={(e) => setAllergyNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAllergyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </AdminFormDialog>

      <AdminFormDialog
        open={conditionOpen}
        onOpenChange={setConditionOpen}
        title="Add condition"
        description="Track an active or resolved condition."
      >
        <form onSubmit={saveCondition} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="condition-name">Condition</Label>
            <Input
              id="condition-name"
              required
              value={conditionName}
              onChange={(e) => setConditionName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <AppSelect
              value={conditionStatus}
              onValueChange={setConditionStatus}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "RESOLVED", label: "Resolved" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="condition-notes">Notes</Label>
            <Textarea
              id="condition-notes"
              rows={2}
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConditionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </AdminFormDialog>

      <AdminFormDialog
        open={encounterOpen}
        onOpenChange={setEncounterOpen}
        title="Add encounter"
        description="Visit notes and vitals for this patient."
        className="sm:max-w-lg"
      >
        <form onSubmit={saveEncounter} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="chief-complaint">Chief complaint</Label>
            <Input
              id="chief-complaint"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bp">BP</Label>
              <Input id="bp" value={bp} onChange={(e) => setBp(e.target.value)} placeholder="120/80" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pulse">Pulse</Label>
              <Input id="pulse" value={pulse} onChange={(e) => setPulse(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temp">Temperature</Label>
              <Input id="temp" value={temp} onChange={(e) => setTemp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight</Label>
              <Input id="weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="encounter-notes">Notes</Label>
            <Textarea
              id="encounter-notes"
              rows={3}
              value={encounterNotes}
              onChange={(e) => setEncounterNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEncounterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </AdminFormDialog>
    </>
  );
}
