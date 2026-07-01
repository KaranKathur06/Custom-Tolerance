"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Field,
  MultiSelectChips,
  NativeSelect,
  TextInput,
  WizardActions,
  WizardShell,
} from "@/components/onboarding/OnboardingV3Wizard";
import { PrivacyVisibilitySelect } from "@/components/onboarding/PrivacyVisibilitySelect";
import { CountryStateCitySelector } from "@/components/location/CountryStateCitySelector";
import { CountryMultiSelect } from "@/components/onboarding/seller/CountryMultiSelect";
import { AgreementCheckbox } from "@/components/legal/AgreementCheckbox";
import {
  ANNUAL_PROCUREMENT_BUDGETS,
  BUYER_DESIGNATIONS,
  BUYER_ONBOARDING_V3_STEPS,
  CATEGORY_INTEREST_OPTIONS,
  COMPANY_TYPES,
  IMPORT_EXPERIENCE_OPTIONS,
  INCOTERMS,
  INDUSTRY_OPTIONS,
  ORDER_FREQUENCIES,
  PAYMENT_TERMS,
  PROCUREMENT_METHODS,
  PROCUREMENT_TEAM_SIZES,
  calculateBuyerOnboardingV3Completion,
} from "@/lib/marketplace/onboarding-v3";
import type { ProfileVisibilityLevel } from "@/lib/marketplace/profile-visibility";
import { BUYER_PRIVACY_DEFAULTS } from "@/lib/marketplace/profile-visibility";

/* ─────────────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────────────── */

type BuyerForm = Record<string, unknown> & {
  // Step 1 — Buyer Registration
  companyName: string;
  companyNameVisibility: ProfileVisibilityLevel;
  businessEmail: string;
  businessEmailVisibility: ProfileVisibilityLevel;
  country: string;
  countryVisibility: ProfileVisibilityLevel;
  state: string;
  city: string;
  companyWebsite: string;
  companyWebsiteVisibility: ProfileVisibilityLevel;
  /** Array of company types — replaces the legacy single-string companyType field */
  companyTypes: string[];
  companyTypesVisibility: ProfileVisibilityLevel;
  fullName: string;
  designation: string;
  mobileNumber: string;
  mobileVisibility: ProfileVisibilityLevel;
  industries: string[];
  industriesVisibility: ProfileVisibilityLevel;
  categoryInterests: string[];
  categoryInterestsVisibility: ProfileVisibilityLevel;
  // Agreement tracking
  buyerAgreement: boolean;
  buyerAgreementViewedAt: string | null;
  termsAccepted: boolean;
  termsViewedAt: string | null;
  privacyAccepted: boolean;
  privacyViewedAt: string | null;
  // Verification
  emailVerified: boolean;
  mobileVerified: boolean;

  // Step 2 — Business Information
  annualProcurementBudget: string;
  annualProcurementBudgetVisibility: ProfileVisibilityLevel;
  orderFrequency: string;
  procurementMethods: string[];
  procurementMethodsVisibility: ProfileVisibilityLevel;
  importExperience: string;
  importExperienceVisibility: ProfileVisibilityLevel;
  countriesImportedFrom: string[];
  countriesImportedFromVisibility: ProfileVisibilityLevel;
  preferredIncoterms: string[];
  preferredIncotermsVisibility: ProfileVisibilityLevel;
  preferredPaymentTerms: string[];
  preferredPaymentTermsVisibility: ProfileVisibilityLevel;

  // Step 3 — Profile Completion
  companyDescription: string;
  procurementTeamSize: string;
  linkedinUrl: string;
  linkedinVisibility: ProfileVisibilityLevel;
  facebookUrl: string;
};

const initialForm: BuyerForm = {
  // Step 1
  companyName: "",
  companyNameVisibility: BUYER_PRIVACY_DEFAULTS.companyName,
  businessEmail: "",
  businessEmailVisibility: BUYER_PRIVACY_DEFAULTS.email,
  country: "",
  countryVisibility: BUYER_PRIVACY_DEFAULTS.country,
  state: "",
  city: "",
  companyWebsite: "",
  companyWebsiteVisibility: BUYER_PRIVACY_DEFAULTS.website,
  companyTypes: [],
  companyTypesVisibility: BUYER_PRIVACY_DEFAULTS.companyTypes,
  fullName: "",
  designation: "",
  mobileNumber: "",
  mobileVisibility: BUYER_PRIVACY_DEFAULTS.mobile,
  industries: [],
  industriesVisibility: BUYER_PRIVACY_DEFAULTS.industries,
  categoryInterests: [],
  categoryInterestsVisibility: BUYER_PRIVACY_DEFAULTS.categoryInterests,
  buyerAgreement: false,
  buyerAgreementViewedAt: null,
  termsAccepted: false,
  termsViewedAt: null,
  privacyAccepted: false,
  privacyViewedAt: null,
  emailVerified: false,
  mobileVerified: false,

  // Step 2
  annualProcurementBudget: "",
  annualProcurementBudgetVisibility:
    BUYER_PRIVACY_DEFAULTS.annualProcurementBudget,
  orderFrequency: "",
  procurementMethods: [],
  procurementMethodsVisibility: BUYER_PRIVACY_DEFAULTS.procurementMethods,
  importExperience: "",
  importExperienceVisibility: BUYER_PRIVACY_DEFAULTS.importExperience,
  countriesImportedFrom: [],
  countriesImportedFromVisibility: BUYER_PRIVACY_DEFAULTS.countriesImportedFrom,
  preferredIncoterms: [],
  preferredIncotermsVisibility: BUYER_PRIVACY_DEFAULTS.preferredIncoterms,
  preferredPaymentTerms: [],
  preferredPaymentTermsVisibility: BUYER_PRIVACY_DEFAULTS.preferredPaymentTerms,

  // Step 3
  companyDescription: "",
  procurementTeamSize: "",
  linkedinUrl: "",
  linkedinVisibility: BUYER_PRIVACY_DEFAULTS.linkedin,
  facebookUrl: "",
};

/* ─────────────────────────────────────────────────────────────────────────
   Backward-compat helper — legacy companyType (string) → companyTypes ([])
   ───────────────────────────────────────────────────────────────────────── */

function normalizeDraftPayload(
  raw: Record<string, unknown>,
): Partial<BuyerForm> {
  const patch = { ...raw } as Partial<BuyerForm>;

  // Migrate legacy single companyType string to companyTypes array
  if (!patch.companyTypes || (patch.companyTypes as unknown[]).length === 0) {
    const legacy = raw.companyType;
    if (typeof legacy === "string" && legacy.trim()) {
      patch.companyTypes = [legacy.trim()];
    }
  }

  // Ensure arrays are arrays, not strings (old free-text field)
  if (!Array.isArray(patch.countriesImportedFrom)) {
    const raw_ = raw.countriesImportedFrom;
    if (typeof raw_ === "string" && raw_.trim()) {
      patch.countriesImportedFrom = raw_
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      patch.countriesImportedFrom = [];
    }
  }

  // Migrate legacy plain boolean agreements (no viewedAt) — keep viewed state null so
  // the user must re-confirm under the new enforced flow, preserving audit integrity
  if (typeof raw.buyerAgreementViewedAt === "undefined") {
    patch.buyerAgreementViewedAt = null;
    // Reset acceptance so they re-read under the new flow
    patch.buyerAgreement = false;
  }
  if (typeof raw.termsViewedAt === "undefined") {
    patch.termsViewedAt = null;
    patch.termsAccepted = false;
  }
  if (typeof raw.privacyViewedAt === "undefined") {
    patch.privacyViewedAt = null;
    patch.privacyAccepted = false;
  }

  return patch;
}

/* ─────────────────────────────────────────────────────────────────────────
   Page Component
   ───────────────────────────────────────────────────────────────────────── */

export default function BuyerOnboardingPage() {
  const router = useRouter();
  const { profile, isAuthenticated, loading, user } = useAuth();
  const [form, setForm] = useState<BuyerForm>(initialForm);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Hydrate from auth profile
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || profile?.full_name || "",
      businessEmail: prev.businessEmail || profile?.email || user?.email || "",
      mobileNumber: prev.mobileNumber || profile?.phone || "",
      emailVerified: Boolean(user?.email_confirmed_at) || prev.emailVerified,
    }));
  }, [profile, user]);

  // Load saved draft
  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/onboarding/buyer", {
        credentials: "include",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        session?: { draft_payload?: Record<string, unknown> };
      };
      if (payload.session?.draft_payload) {
        setForm((prev) => ({
          ...prev,
          ...normalizeDraftPayload(payload.session!.draft_payload!),
        }));
      }
    })();
  }, []);

  const completion = useMemo(
    () => calculateBuyerOnboardingV3Completion(form),
    [form],
  );
  const activeStep = BUYER_ONBOARDING_V3_STEPS[activeIndex];

  const updateField = (field: keyof BuyerForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  /* ── Validate current step before advancing ── */
  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (activeStep.key === "buyer_registration") {
      if (!form.companyName.trim())
        errors.companyName = "Company name is required";
      if (!form.businessEmail.trim())
        errors.businessEmail = "Business email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.businessEmail))
        errors.businessEmail = "Enter a valid email address";
      if (!form.country) errors.country = "Country is required";
      if (!form.state) errors.state = "State / Province is required";
      if (!form.city) errors.city = "City is required";
      if (!form.companyWebsite.trim())
        errors.companyWebsite = "Company website is required";
      else if (!/^https?:\/\/.+/.test(form.companyWebsite))
        errors.companyWebsite = "Enter a valid URL starting with https://";
      if (form.companyTypes.length === 0)
        errors.companyTypes = "Select at least one company type";
      if (!form.fullName.trim()) errors.fullName = "Full name is required";
      if (!form.designation) errors.designation = "Designation is required";
      if (!form.mobileNumber.trim())
        errors.mobileNumber = "Mobile number is required";
      if (form.industries.length === 0)
        errors.industries = "Select at least one industry";
      if (form.categoryInterests.length === 0)
        errors.categoryInterests = "Select at least one category";
      if (!form.buyerAgreement) {
        if (!form.buyerAgreementViewedAt)
          errors.buyerAgreement = "Please open and read the Buyer Agreement";
        else errors.buyerAgreement = "You must accept the Buyer Agreement";
      }
      if (!form.termsAccepted) {
        if (!form.termsViewedAt)
          errors.termsAccepted = "Please open and read the Terms & Conditions";
        else errors.termsAccepted = "You must accept the Terms & Conditions";
      }
      if (!form.privacyAccepted) {
        if (!form.privacyViewedAt)
          errors.privacyAccepted = "Please open and read the Privacy Policy";
        else errors.privacyAccepted = "You must accept the Privacy Policy";
      }
    }

    if (activeStep.key === "business_information") {
      if (!form.annualProcurementBudget)
        errors.annualProcurementBudget = "Select annual procurement budget";
      if (!form.orderFrequency)
        errors.orderFrequency = "Select order frequency";
      if (form.procurementMethods.length === 0)
        errors.procurementMethods = "Select at least one procurement method";
      if (!form.importExperience)
        errors.importExperience = "Select import experience";
      if (form.countriesImportedFrom.length === 0)
        errors.countriesImportedFrom = "Select at least one country";
      if (form.preferredIncoterms.length === 0)
        errors.preferredIncoterms = "Select at least one incoterm";
      if (form.preferredPaymentTerms.length === 0)
        errors.preferredPaymentTerms = "Select at least one payment term";
    }

    if (activeStep.key === "profile_completion") {
      if (!form.companyDescription.trim())
        errors.companyDescription = "Company description is required";
      if (form.companyDescription.trim().length < 50)
        errors.companyDescription =
          "Description must be at least 50 characters";
      if (!form.procurementTeamSize)
        errors.procurementTeamSize = "Select procurement team size";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setGlobalError("Please complete all required fields before continuing.");
      return false;
    }
    return true;
  };

  const save = async (action: "save" | "commit"): Promise<boolean> => {
    setSaving(true);
    setGlobalError(null);
    try {
      const response = await fetch("/api/onboarding/buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, stepKey: activeStep.key, values: form }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        setGlobalError(
          data.error ??
            data.message ??
            "Failed to save buyer onboarding. Please try again.",
        );
        return false;
      }
      return true;
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Network error. Please check your connection.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    const isValid = validateCurrentStep();
    if (!isValid) return;
    setGlobalError(null);

    const isLast = activeIndex === BUYER_ONBOARDING_V3_STEPS.length - 1;
    const ok = await save(isLast ? "commit" : "save");
    if (!ok) return;

    if (isLast) {
      router.push("/buyer/requirements");
    } else {
      setActiveIndex((index) => index + 1);
    }
  };

  /* ── Loading / Auth gates ── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-16 text-center">
        <p className="mb-4 text-slate-600">
          Login to complete buyer onboarding.
        </p>
        <Link href="/login?redirect=/onboarding/buyer">
          <Button>Login</Button>
        </Link>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <WizardShell
      roleLabel="Buyer Onboarding"
      title="Buyer onboarding"
      subtitle="Build a procurement profile that unlocks RFQs, supplier contact, saved suppliers, and matching intelligence."
      steps={BUYER_ONBOARDING_V3_STEPS}
      activeStep={activeStep.key}
      completion={completion}
      globalError={globalError}
      onClearGlobalError={() => setGlobalError(null)}
      onSaveDraft={() => void save("save")}
      trustItems={[
        { label: "Email", verified: form.emailVerified },
        { label: "Mobile", verified: form.mobileVerified },
        {
          label: "Agreements",
          verified:
            form.buyerAgreement && form.termsAccepted && form.privacyAccepted,
        },
      ]}
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950">{activeStep.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{activeStep.goal}</p>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          STEP 1 — Buyer Registration
      ──────────────────────────────────────────────────────────────── */}
      {activeStep.key === "buyer_registration" ? (
        <div className="mt-6 space-y-6">
          {/* Company identity */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Company Identity
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Field
                  label="Company name"
                  required
                  error={fieldErrors.companyName}
                >
                  <TextInput
                    value={form.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    error={Boolean(fieldErrors.companyName)}
                  />
                </Field>
                <PrivacyVisibilitySelect
                  className="mt-2"
                  value={form.companyNameVisibility}
                  onChange={(v) => updateField("companyNameVisibility", v)}
                />
              </div>
              <div>
                <Field
                  label="Company website"
                  required
                  error={fieldErrors.companyWebsite}
                >
                  <TextInput
                    value={form.companyWebsite}
                    onChange={(e) =>
                      updateField("companyWebsite", e.target.value)
                    }
                    placeholder="https://example.com"
                    error={Boolean(fieldErrors.companyWebsite)}
                  />
                </Field>
                <PrivacyVisibilitySelect
                  className="mt-2"
                  value={form.companyWebsiteVisibility}
                  onChange={(v) => updateField("companyWebsiteVisibility", v)}
                />
              </div>
            </div>

            {/* Company type — multi-select pills */}
            <div>
              <Field
                label="Company type"
                required
                error={fieldErrors.companyTypes}
              >
                <MultiSelectChips
                  options={[...COMPANY_TYPES]}
                  value={form.companyTypes}
                  onChange={(v) => updateField("companyTypes", v)}
                  error={Boolean(fieldErrors.companyTypes)}
                />
              </Field>
              <PrivacyVisibilitySelect
                className="mt-2"
                value={form.companyTypesVisibility}
                onChange={(v) => updateField("companyTypesVisibility", v)}
              />
            </div>
          </div>

          {/* Location — cascading Country → State → City */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Company Location
            </h3>
            <CountryStateCitySelector
              country={form.country}
              state={form.state}
              city={form.city}
              onCountryChange={(v) => updateField("country", v)}
              onStateChange={(v) => updateField("state", v)}
              onCityChange={(v) => updateField("city", v)}
              errors={{
                country: fieldErrors.country,
                state: fieldErrors.state,
                city: fieldErrors.city,
              }}
            />
            <PrivacyVisibilitySelect
              className="mt-1"
              value={form.countryVisibility}
              onChange={(v) => updateField("countryVisibility", v)}
            />
          </div>

          {/* Contact details */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Contact Details
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" required error={fieldErrors.fullName}>
                <TextInput
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  error={Boolean(fieldErrors.fullName)}
                />
              </Field>
              <Field
                label="Designation"
                required
                error={fieldErrors.designation}
              >
                <NativeSelect
                  value={form.designation}
                  onChange={(v) => updateField("designation", v)}
                  options={[...BUYER_DESIGNATIONS]}
                  error={Boolean(fieldErrors.designation)}
                />
              </Field>
              <div>
                <Field
                  label="Business email"
                  required
                  error={fieldErrors.businessEmail}
                >
                  <TextInput
                    value={form.businessEmail}
                    onChange={(e) =>
                      updateField("businessEmail", e.target.value)
                    }
                    error={Boolean(fieldErrors.businessEmail)}
                  />
                </Field>
                <PrivacyVisibilitySelect
                  className="mt-2"
                  value={form.businessEmailVisibility}
                  onChange={(v) => updateField("businessEmailVisibility", v)}
                />
              </div>
              <div>
                <Field
                  label="Mobile number"
                  required
                  error={fieldErrors.mobileNumber}
                >
                  <TextInput
                    value={form.mobileNumber}
                    onChange={(e) =>
                      updateField("mobileNumber", e.target.value)
                    }
                    placeholder="+1 555 000 0000"
                    error={Boolean(fieldErrors.mobileNumber)}
                  />
                </Field>
                <PrivacyVisibilitySelect
                  className="mt-2"
                  value={form.mobileVisibility}
                  onChange={(v) => updateField("mobileVisibility", v)}
                />
              </div>
            </div>
          </div>

          {/* Procurement interests */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Procurement Interests
            </h3>
            <div>
              <Field label="Industry" required error={fieldErrors.industries}>
                <MultiSelectChips
                  options={[...INDUSTRY_OPTIONS]}
                  value={form.industries}
                  onChange={(v) => updateField("industries", v)}
                  error={Boolean(fieldErrors.industries)}
                />
              </Field>
              <PrivacyVisibilitySelect
                className="mt-2"
                value={form.industriesVisibility}
                onChange={(v) => updateField("industriesVisibility", v)}
              />
            </div>
            <div>
              <Field
                label="Category interest"
                required
                error={fieldErrors.categoryInterests}
              >
                <MultiSelectChips
                  options={[...CATEGORY_INTEREST_OPTIONS]}
                  value={form.categoryInterests}
                  onChange={(v) => updateField("categoryInterests", v)}
                  error={Boolean(fieldErrors.categoryInterests)}
                />
              </Field>
              <PrivacyVisibilitySelect
                className="mt-2"
                value={form.categoryInterestsVisibility}
                onChange={(v) => updateField("categoryInterestsVisibility", v)}
              />
            </div>
          </div>

          {/* Legal agreements — enforced review flow */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Legal Agreements
            </h3>
            <p className="text-xs text-slate-500">
              You must open and read each document before accepting. Your
              acceptance is recorded with a timestamp.
            </p>

            {fieldErrors.buyerAgreement ? (
              <p className="text-xs font-semibold text-red-600">
                {fieldErrors.buyerAgreement}
              </p>
            ) : null}
            <AgreementCheckbox
              label="Buyer Agreement"
              href="/legal/buyer-agreement"
              checked={form.buyerAgreement}
              onChange={(v) => updateField("buyerAgreement", v)}
              viewedAt={form.buyerAgreementViewedAt}
              onView={() =>
                updateField("buyerAgreementViewedAt", new Date().toISOString())
              }
              description="Governs your use of the CustomTolerance marketplace as a buyer."
            />

            {fieldErrors.termsAccepted ? (
              <p className="text-xs font-semibold text-red-600">
                {fieldErrors.termsAccepted}
              </p>
            ) : null}
            <AgreementCheckbox
              label="Terms & Conditions"
              href="/terms"
              checked={form.termsAccepted}
              onChange={(v) => updateField("termsAccepted", v)}
              viewedAt={form.termsViewedAt}
              onView={() =>
                updateField("termsViewedAt", new Date().toISOString())
              }
              description="Platform-wide terms of service that apply to all users."
            />

            {fieldErrors.privacyAccepted ? (
              <p className="text-xs font-semibold text-red-600">
                {fieldErrors.privacyAccepted}
              </p>
            ) : null}
            <AgreementCheckbox
              label="Privacy Policy"
              href="/privacy"
              checked={form.privacyAccepted}
              onChange={(v) => updateField("privacyAccepted", v)}
              viewedAt={form.privacyViewedAt}
              onView={() =>
                updateField("privacyViewedAt", new Date().toISOString())
              }
              description="How we collect, store, and use your procurement data."
            />
          </div>
        </div>
      ) : null}

      {/* ────────────────────────────────────────────────────────────────
          STEP 2 — Business Information
      ──────────────────────────────────────────────────────────────── */}
      {activeStep.key === "business_information" ? (
        <div className="mt-6 space-y-6">
          {/* Procurement behavior */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Procurement Behavior
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Field
                  label="Annual procurement budget"
                  required
                  error={fieldErrors.annualProcurementBudget}
                >
                  <NativeSelect
                    value={form.annualProcurementBudget}
                    onChange={(v) => updateField("annualProcurementBudget", v)}
                    options={[...ANNUAL_PROCUREMENT_BUDGETS]}
                    error={Boolean(fieldErrors.annualProcurementBudget)}
                  />
                </Field>
                <PrivacyVisibilitySelect
                  className="mt-2"
                  value={form.annualProcurementBudgetVisibility}
                  onChange={(v) =>
                    updateField("annualProcurementBudgetVisibility", v)
                  }
                />
              </div>
              <Field
                label="Order frequency"
                required
                error={fieldErrors.orderFrequency}
              >
                <NativeSelect
                  value={form.orderFrequency}
                  onChange={(v) => updateField("orderFrequency", v)}
                  options={[...ORDER_FREQUENCIES]}
                  error={Boolean(fieldErrors.orderFrequency)}
                />
              </Field>
              <div>
                <Field
                  label="Import experience"
                  required
                  error={fieldErrors.importExperience}
                >
                  <NativeSelect
                    value={form.importExperience}
                    onChange={(v) => updateField("importExperience", v)}
                    options={[...IMPORT_EXPERIENCE_OPTIONS]}
                    error={Boolean(fieldErrors.importExperience)}
                  />
                </Field>
                <PrivacyVisibilitySelect
                  className="mt-2"
                  value={form.importExperienceVisibility}
                  onChange={(v) => updateField("importExperienceVisibility", v)}
                />
              </div>
            </div>
            <div>
              <Field
                label="Procurement method"
                required
                error={fieldErrors.procurementMethods}
              >
                <MultiSelectChips
                  options={[...PROCUREMENT_METHODS]}
                  value={form.procurementMethods}
                  onChange={(v) => updateField("procurementMethods", v)}
                  error={Boolean(fieldErrors.procurementMethods)}
                />
              </Field>
              <PrivacyVisibilitySelect
                className="mt-2"
                value={form.procurementMethodsVisibility}
                onChange={(v) => updateField("procurementMethodsVisibility", v)}
              />
            </div>
          </div>

          {/* Sourcing geography */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Sourcing Geography
            </h3>
            <div>
              <Field
                label="Countries imported from"
                required
                error={fieldErrors.countriesImportedFrom}
              >
                <CountryMultiSelect
                  value={form.countriesImportedFrom}
                  onChange={(v) => updateField("countriesImportedFrom", v)}
                  error={fieldErrors.countriesImportedFrom}
                  placeholder="Search and select countries..."
                />
              </Field>
              <PrivacyVisibilitySelect
                className="mt-2"
                value={form.countriesImportedFromVisibility}
                onChange={(v) =>
                  updateField("countriesImportedFromVisibility", v)
                }
              />
            </div>
          </div>

          {/* Trade terms */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Trade Terms
            </h3>
            <div>
              <Field
                label="Preferred incoterms"
                required
                error={fieldErrors.preferredIncoterms}
              >
                <MultiSelectChips
                  options={[...INCOTERMS]}
                  value={form.preferredIncoterms}
                  onChange={(v) => updateField("preferredIncoterms", v)}
                  error={Boolean(fieldErrors.preferredIncoterms)}
                />
              </Field>
              <PrivacyVisibilitySelect
                className="mt-2"
                value={form.preferredIncotermsVisibility}
                onChange={(v) => updateField("preferredIncotermsVisibility", v)}
              />
            </div>
            <div>
              <Field
                label="Preferred payment terms"
                required
                error={fieldErrors.preferredPaymentTerms}
              >
                <MultiSelectChips
                  options={[...PAYMENT_TERMS]}
                  value={form.preferredPaymentTerms}
                  onChange={(v) => updateField("preferredPaymentTerms", v)}
                  error={Boolean(fieldErrors.preferredPaymentTerms)}
                />
              </Field>
              <PrivacyVisibilitySelect
                className="mt-2"
                value={form.preferredPaymentTermsVisibility}
                onChange={(v) =>
                  updateField("preferredPaymentTermsVisibility", v)
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* ────────────────────────────────────────────────────────────────
          STEP 3 — Profile Completion
      ──────────────────────────────────────────────────────────────── */}
      {activeStep.key === "profile_completion" ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              About Your Company
            </h3>
            <div>
              <Field
                label="Company description"
                required
                error={fieldErrors.companyDescription}
              >
                <Textarea
                  value={form.companyDescription}
                  maxLength={500}
                  onChange={(e) =>
                    updateField("companyDescription", e.target.value)
                  }
                  rows={5}
                  placeholder="Describe your company, what you source, and your procurement scale. (Min 50 characters)"
                  className={
                    fieldErrors.companyDescription ? "border-red-300" : ""
                  }
                />
              </Field>
              <p className="mt-1 text-right text-xs text-slate-400">
                {form.companyDescription.length}/500
              </p>
            </div>
            <Field
              label="Procurement team size"
              required
              error={fieldErrors.procurementTeamSize}
            >
              <NativeSelect
                value={form.procurementTeamSize}
                onChange={(v) => updateField("procurementTeamSize", v)}
                options={[...PROCUREMENT_TEAM_SIZES]}
                error={Boolean(fieldErrors.procurementTeamSize)}
              />
            </Field>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Social & Professional Links
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Field label="LinkedIn">
                  <TextInput
                    value={form.linkedinUrl}
                    onChange={(e) => updateField("linkedinUrl", e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                  />
                </Field>
                <PrivacyVisibilitySelect
                  className="mt-2"
                  value={form.linkedinVisibility}
                  onChange={(v) => updateField("linkedinVisibility", v)}
                />
              </div>
              <Field label="Facebook">
                <TextInput
                  value={form.facebookUrl}
                  onChange={(e) => updateField("facebookUrl", e.target.value)}
                  placeholder="https://facebook.com/..."
                />
              </Field>
            </div>
          </div>
        </div>
      ) : null}

      <WizardActions
        saving={saving}
        canBack={activeIndex > 0}
        canNext
        submitLabel={
          activeIndex === BUYER_ONBOARDING_V3_STEPS.length - 1
            ? "Complete buyer profile"
            : undefined
        }
        onBack={() => {
          setFieldErrors({});
          setGlobalError(null);
          setActiveIndex((index) => Math.max(0, index - 1));
        }}
        onSave={() => void save("save")}
        onNext={() => void next()}
      />
    </WizardShell>
  );
}
