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

type BuyerForm = Record<string, unknown> & {
  companyName: string;
  businessEmail: string;
  country: string;
  state: string;
  city: string;
  companyWebsite: string;
  companyType: string;
  fullName: string;
  designation: string;
  mobileNumber: string;
  industries: string[];
  categoryInterests: string[];
  annualProcurementBudget: string;
  orderFrequency: string;
  procurementMethods: string[];
  importExperience: string;
  countriesImportedFrom: string[];
  preferredIncoterms: string[];
  preferredPaymentTerms: string[];
  companyDescription: string;
  procurementTeamSize: string;
  linkedinUrl: string;
  facebookUrl: string;
  buyerAgreement: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  emailVerified: boolean;
  mobileVerified: boolean;
};

const initialForm: BuyerForm = {
  companyName: "",
  businessEmail: "",
  country: "",
  state: "",
  city: "",
  companyWebsite: "",
  companyType: "",
  fullName: "",
  designation: "",
  mobileNumber: "",
  industries: [],
  categoryInterests: [],
  annualProcurementBudget: "",
  orderFrequency: "",
  procurementMethods: [],
  importExperience: "",
  countriesImportedFrom: [],
  preferredIncoterms: [],
  preferredPaymentTerms: [],
  companyDescription: "",
  procurementTeamSize: "",
  linkedinUrl: "",
  facebookUrl: "",
  buyerAgreement: false,
  termsAccepted: false,
  privacyAccepted: false,
  emailVerified: false,
  mobileVerified: false,
};

export default function BuyerOnboardingPage() {
  const router = useRouter();
  const { profile, isAuthenticated, loading, user } = useAuth();
  const [form, setForm] = useState<BuyerForm>(initialForm);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || profile?.full_name || "",
      businessEmail: prev.businessEmail || profile?.email || user?.email || "",
      mobileNumber: prev.mobileNumber || profile?.phone || "",
      emailVerified: Boolean(user?.email_confirmed_at) || prev.emailVerified,
    }));
  }, [profile, user]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/onboarding/buyer", { credentials: "include" });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.session?.draft_payload) {
        setForm((prev) => ({ ...prev, ...payload.session.draft_payload }));
      }
    })();
  }, []);

  const completion = useMemo(() => calculateBuyerOnboardingV3Completion(form), [form]);
  const activeStep = BUYER_ONBOARDING_V3_STEPS[activeIndex];

  const updateField = (field: keyof BuyerForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async (action: "save" | "commit") => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding/buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, stepKey: activeStep.key, values: form }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? data.error?.message ?? "Failed to save buyer onboarding");
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    const isLast = activeIndex === BUYER_ONBOARDING_V3_STEPS.length - 1;
    const ok = await save(isLast ? "commit" : "save");
    if (!ok) return;
    if (isLast) {
      router.push("/buyer/requirements");
    } else {
      setActiveIndex((index) => index + 1);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-16 text-center">
        <p className="mb-4 text-slate-600">Login to complete buyer onboarding.</p>
        <Link href="/login?redirect=/onboarding/buyer"><Button>Login</Button></Link>
      </div>
    );
  }

  return (
    <WizardShell
      title="Buyer onboarding"
      subtitle="Build a procurement profile that unlocks RFQs, supplier contact, saved suppliers, and matching intelligence."
      steps={BUYER_ONBOARDING_V3_STEPS}
      activeStep={activeStep.key}
      completion={completion}
      trustItems={[
        { label: "Email", verified: form.emailVerified },
        { label: "Mobile", verified: form.mobileVerified },
        { label: "Agreements", verified: form.buyerAgreement && form.termsAccepted && form.privacyAccepted },
      ]}
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950">{activeStep.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{activeStep.goal}</p>
        {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      </div>

      {activeStep.key === "buyer_registration" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Company name" required><TextInput value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} /></Field>
          <Field label="Business email" required><TextInput value={form.businessEmail} onChange={(e) => updateField("businessEmail", e.target.value)} /></Field>
          <Field label="Country" required><TextInput value={form.country} onChange={(e) => updateField("country", e.target.value)} /></Field>
          <Field label="State" required><TextInput value={form.state} onChange={(e) => updateField("state", e.target.value)} /></Field>
          <Field label="City" required><TextInput value={form.city} onChange={(e) => updateField("city", e.target.value)} /></Field>
          <Field label="Company website" required><TextInput value={form.companyWebsite} onChange={(e) => updateField("companyWebsite", e.target.value)} /></Field>
          <Field label="Company type" required><NativeSelect value={form.companyType} onChange={(value) => updateField("companyType", value)} options={COMPANY_TYPES} /></Field>
          <Field label="Full name" required><TextInput value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} /></Field>
          <Field label="Designation" required><NativeSelect value={form.designation} onChange={(value) => updateField("designation", value)} options={BUYER_DESIGNATIONS} /></Field>
          <Field label="Mobile number" required><TextInput value={form.mobileNumber} onChange={(e) => updateField("mobileNumber", e.target.value)} /></Field>
          <div className="md:col-span-2">
            <Field label="Industry" required><MultiSelectChips options={INDUSTRY_OPTIONS} value={form.industries} onChange={(value) => updateField("industries", value)} /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Category interest" required><MultiSelectChips options={CATEGORY_INTEREST_OPTIONS} value={form.categoryInterests} onChange={(value) => updateField("categoryInterests", value)} /></Field>
          </div>
          <Agreement label="Buyer Agreement" checked={form.buyerAgreement} onChange={(value) => updateField("buyerAgreement", value)} />
          <Agreement label="Terms and Conditions" checked={form.termsAccepted} onChange={(value) => updateField("termsAccepted", value)} />
          <Agreement label="Privacy Policy" checked={form.privacyAccepted} onChange={(value) => updateField("privacyAccepted", value)} />
        </div>
      ) : null}

      {activeStep.key === "business_information" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Annual procurement budget" required><NativeSelect value={form.annualProcurementBudget} onChange={(value) => updateField("annualProcurementBudget", value)} options={ANNUAL_PROCUREMENT_BUDGETS} /></Field>
          <Field label="Order frequency" required><NativeSelect value={form.orderFrequency} onChange={(value) => updateField("orderFrequency", value)} options={ORDER_FREQUENCIES} /></Field>
          <div className="md:col-span-2"><Field label="Procurement method" required><MultiSelectChips options={PROCUREMENT_METHODS} value={form.procurementMethods} onChange={(value) => updateField("procurementMethods", value)} /></Field></div>
          <Field label="Import experience" required><NativeSelect value={form.importExperience} onChange={(value) => updateField("importExperience", value)} options={IMPORT_EXPERIENCE_OPTIONS} /></Field>
          <Field label="Countries imported from"><TextInput value={form.countriesImportedFrom.join(", ")} onChange={(e) => updateField("countriesImportedFrom", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="Germany, Japan, China" /></Field>
          <div className="md:col-span-2"><Field label="Preferred incoterms" required><MultiSelectChips options={INCOTERMS} value={form.preferredIncoterms} onChange={(value) => updateField("preferredIncoterms", value)} /></Field></div>
          <div className="md:col-span-2"><Field label="Preferred payment terms" required><MultiSelectChips options={PAYMENT_TERMS} value={form.preferredPaymentTerms} onChange={(value) => updateField("preferredPaymentTerms", value)} /></Field></div>
        </div>
      ) : null}

      {activeStep.key === "profile_completion" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Company description" required>
              <Textarea value={form.companyDescription} maxLength={500} onChange={(e) => updateField("companyDescription", e.target.value)} rows={4} />
            </Field>
          </div>
          <Field label="Procurement team size" required><NativeSelect value={form.procurementTeamSize} onChange={(value) => updateField("procurementTeamSize", value)} options={PROCUREMENT_TEAM_SIZES} /></Field>
          <Field label="LinkedIn"><TextInput value={form.linkedinUrl} onChange={(e) => updateField("linkedinUrl", e.target.value)} /></Field>
          <Field label="Facebook"><TextInput value={form.facebookUrl} onChange={(e) => updateField("facebookUrl", e.target.value)} /></Field>
        </div>
      ) : null}

      <WizardActions
        saving={saving}
        canBack={activeIndex > 0}
        canNext
        submitLabel={activeIndex === BUYER_ONBOARDING_V3_STEPS.length - 1 ? "Complete buyer profile" : undefined}
        onBack={() => setActiveIndex((index) => Math.max(0, index - 1))}
        onSave={() => void save("save")}
        onNext={() => void next()}
      />
    </WizardShell>
  );
}

function Agreement({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-10 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
