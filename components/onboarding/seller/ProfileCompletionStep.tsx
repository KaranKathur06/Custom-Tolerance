"use client";

import { Textarea } from "@/components/ui/textarea";
import { Field, MultiSelectChips } from "@/components/onboarding/OnboardingV3Wizard";
import { QUALITY_SYSTEM_OPTIONS, FACTORY_PHOTO_CATEGORIES, FACTORY_PHOTO_LIMITS } from "@/lib/marketplace/onboarding-v3";
import { ImageUploadGrid } from "./ImageUploadGrid";
import { VideoUploadField } from "./VideoUploadField";
import { MachinesEditor } from "./MachinesEditor";
import { CertificationsEditor } from "./CertificationsEditor";
import { ExportExperienceEditor } from "./ExportExperienceEditor";
import type { StepProps, MachineRow, CertificationRow, ExportRow } from "./types";

export function ProfileCompletionStep({
  form,
  errors,
  images,
  video,
  onFieldChange,
  onImagesChange,
  onVideoChange,
  onVideoUrlChange,
}: StepProps) {
  const machines = Array.isArray(form.machines) ? (form.machines as MachineRow[]) : [];
  const certifications = Array.isArray(form.certifications) ? (form.certifications as CertificationRow[]) : [];
  const exportExperience = Array.isArray(form.exportExperience) ? (form.exportExperience as ExportRow[]) : [];
  const qualitySystems = Array.isArray(form.qualitySystems) ? (form.qualitySystems as string[]) : [];

  return (
    <div className="mt-6 space-y-8">
      <p className="text-sm text-slate-600">
        Add factory evidence, machines, certifications, export history, and quality systems to strengthen your seller profile.
      </p>

      <Field label="Company description" error={errors.companyDescription}>
        <Textarea
          value={String(form.companyDescription || "")}
          onChange={(e) => onFieldChange("companyDescription", e.target.value)}
          rows={4}
          className={errors.companyDescription ? "border-red-300" : ""}
        />
      </Field>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Factory Gallery</h3>
        <p className="mb-4 text-xs text-slate-500">
          Upload photos of your factory, machines, and facilities. Buyers trust sellers with real visual evidence.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FACTORY_PHOTO_CATEGORIES.map((category) => {
            const limits = FACTORY_PHOTO_LIMITS[category];
            return (
              <ImageUploadGrid
                key={category}
                category={category}
                label={`${category} Photos`}
                required={limits ? limits.min > 0 : false}
                images={images[category] || []}
                min={limits?.min ?? 0}
                max={limits?.max ?? 10}
                error={errors[`factoryPhotos_${category}`] || errors.factoryPhotos}
                onChange={(value) => onImagesChange(category, value)}
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
        <MachinesEditor
          rows={machines}
          errors={errors}
          onChange={(value) => onFieldChange("machines", value)}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
        <CertificationsEditor
          rows={certifications}
          errors={errors}
          onChange={(value) => onFieldChange("certifications", value)}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
        <ExportExperienceEditor
          rows={exportExperience}
          errors={errors}
          onChange={(value) => onFieldChange("exportExperience", value)}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
        <Field label="Quality systems">
          <MultiSelectChips
            options={QUALITY_SYSTEM_OPTIONS}
            value={qualitySystems}
            onChange={(value) => onFieldChange("qualitySystems", value)}
          />
        </Field>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
        <VideoUploadField
          video={video}
          videoUrl={String(form.factoryTourUrl || "")}
          onVideoChange={onVideoChange}
          onUrlChange={(url) => {
            onVideoUrlChange(url);
            if (!url && video) onVideoChange(null);
          }}
        />
      </div>
    </div>
  );
}
