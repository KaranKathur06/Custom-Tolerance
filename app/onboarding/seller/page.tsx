"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
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
  CAPABILITY_CATEGORIES,
  FACTORY_PHOTO_CATEGORIES,
  LANGUAGE_OPTIONS,
  MATERIAL_OPTIONS,
  QUALITY_SYSTEM_OPTIONS,
  SELLER_ONBOARDING_V3_STEPS,
  SELLER_TYPES,
  SUB_CAPABILITIES,
  calculateSellerOnboardingV3Completion,
  getSellerV3HardGateStatus,
} from "@/lib/marketplace/onboarding-v3";

type MachineRow = { machineName: string; brand: string; model: string; quantity: string; capacity: string; yearPurchased: string };
type CertificationRow = { certificateName: string; certificateNumber: string; expiryDate: string };
type ExportRow = { customerName: string; country: string; productExported: string; orderValue: string };

type SellerForm = Record<string, unknown> & {
  gstNumber: string;
  gstVerified: boolean;
  gstProvider: string;
  gstDetails: Record<string, unknown>;
  companyName: string;
  legalBusinessName: string;
  tradeName: string;
  registeredAddress: string;
  state: string;
  city: string;
  pincode: string;
  contactPersonName: string;
  designation: string;
  mobileNumber: string;
  businessEmail: string;
  factoryAddress: string;
  factorySameAsRegistered: boolean;
  emailVerified: boolean;
  mobileVerified: boolean;
  sellerType: string;
  mainIndustry: string;
  capabilityCategories: string[];
  subCapabilities: Array<{ categoryName: string; name: string }>;
  materials: string[];
  monthlyCapacity: string;
  moq: string;
  leadTime: string;
  factoryArea: string;
  shopFloorEmployees: string;
  engineers: string;
  qcTeamSize: string;
  countriesExportingTo: string[];
  languagesSupported: string[];
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  branchName: string;
  bankVerified: boolean;
  panNumber: string;
  panUploaded: boolean;
  iecNumber: string;
  msmeNumber: string;
  factoryLicenseUploaded: boolean;
  sellerAgreement: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  kycConsent: boolean;
  companyDescription: string;
  factoryPhotos: Array<{ category: string; fileUrl: string }>;
  machines: MachineRow[];
  certifications: CertificationRow[];
  exportExperience: ExportRow[];
  qualitySystems: string[];
  factoryTourUrl: string;
};

const initialForm: SellerForm = {
  gstNumber: "",
  gstVerified: false,
  gstProvider: "",
  gstDetails: {},
  companyName: "",
  legalBusinessName: "",
  tradeName: "",
  registeredAddress: "",
  state: "",
  city: "",
  pincode: "",
  contactPersonName: "",
  designation: "",
  mobileNumber: "",
  businessEmail: "",
  factoryAddress: "",
  factorySameAsRegistered: false,
  emailVerified: false,
  mobileVerified: false,
  sellerType: "",
  mainIndustry: "Industrial Goods",
  capabilityCategories: [],
  subCapabilities: [],
  materials: [],
  monthlyCapacity: "",
  moq: "",
  leadTime: "",
  factoryArea: "",
  shopFloorEmployees: "",
  engineers: "",
  qcTeamSize: "",
  countriesExportingTo: [],
  languagesSupported: [],
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  branchName: "",
  bankVerified: false,
  panNumber: "",
  panUploaded: false,
  iecNumber: "",
  msmeNumber: "",
  factoryLicenseUploaded: false,
  sellerAgreement: false,
  termsAccepted: false,
  privacyAccepted: false,
  kycConsent: false,
  companyDescription: "",
  factoryPhotos: [],
  machines: [],
  certifications: [],
  exportExperience: [],
  qualitySystems: [],
  factoryTourUrl: "",
};

export default function SellerOnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, loading, profile, user } = useAuth();
  const [form, setForm] = useState<SellerForm>(initialForm);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      contactPersonName: prev.contactPersonName || profile?.full_name || "",
      businessEmail: prev.businessEmail || profile?.email || user?.email || "",
      mobileNumber: prev.mobileNumber || profile?.phone || "",
      emailVerified: Boolean(user?.email_confirmed_at) || prev.emailVerified,
    }));
  }, [profile, user]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/onboarding/seller", { credentials: "include" });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.session?.draft_payload) {
        setForm((prev) => ({ ...prev, ...payload.session.draft_payload }));
      }
    })();
  }, []);

  const completion = useMemo(() => calculateSellerOnboardingV3Completion(form), [form]);
  const gate = useMemo(() => getSellerV3HardGateStatus(form), [form]);
  const activeStep = SELLER_ONBOARDING_V3_STEPS[activeIndex];

  const updateField = (field: keyof SellerForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const verifyGst = async () => {
    setVerifyingGst(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding/seller/gst/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gstNumber: form.gstNumber,
          legalName: form.legalBusinessName,
          state: form.state,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? "GST verification failed");
        return;
      }
      const lookup = payload.data.lookup;
      setForm((prev) => ({
        ...prev,
        gstVerified: Boolean(payload.data.isVerified),
        gstProvider: payload.data.developmentMode ? "development_trust_mode" : "live_provider",
        gstDetails: lookup,
        legalBusinessName: lookup.legalName ?? prev.legalBusinessName,
        companyName: lookup.tradeName ?? lookup.legalName ?? prev.companyName,
        tradeName: lookup.tradeName ?? prev.tradeName,
        state: lookup.gstState ?? prev.state,
        pincode: prev.pincode,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "GST verification failed");
    } finally {
      setVerifyingGst(false);
    }
  };

  const save = async (action: "save" | "submit") => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding/seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, stepKey: activeStep.key, values: form }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? payload.error?.message ?? "Failed to save seller onboarding");
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
    const isLast = activeIndex === SELLER_ONBOARDING_V3_STEPS.length - 1;
    const ok = await save(isLast ? "submit" : "save");
    if (!ok) return;
    if (isLast) {
      router.push("/dashboard/seller?submitted=1");
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
        <p className="mb-4 text-slate-600">Login to complete seller onboarding.</p>
        <Link href="/login?redirect=/onboarding/seller"><Button>Login</Button></Link>
      </div>
    );
  }

  return (
    <WizardShell
      title="Seller verification"
      subtitle="Verify GST, KYC, capabilities, bank details, factory evidence, and production depth before marketplace activation."
      steps={SELLER_ONBOARDING_V3_STEPS}
      activeStep={activeStep.key}
      completion={completion}
      trustItems={[
        { label: "GST", verified: form.gstVerified },
        { label: "Bank", verified: form.bankVerified },
        { label: "Email", verified: form.emailVerified },
        { label: "Mobile", verified: form.mobileVerified },
        { label: "Factory license", verified: form.factoryLicenseUploaded },
      ]}
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950">{activeStep.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{activeStep.goal}</p>
        {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      </div>

      {activeStep.key === "gst_verification" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="GST number" required><TextInput value={form.gstNumber} onChange={(e) => updateField("gstNumber", e.target.value.toUpperCase())} placeholder="24ADUPV1084A2ZF" /></Field>
          <Field label="Legal name fallback"><TextInput value={form.legalBusinessName} onChange={(e) => updateField("legalBusinessName", e.target.value)} /></Field>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <Button type="button" onClick={() => void verifyGst()} disabled={verifyingGst}>
              {verifyingGst ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify GST
            </Button>
            {form.gstVerified ? <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> GST verified</span> : <span className="text-sm text-slate-500">GST must be verified before activation.</span>}
          </div>
          <Field label="Company name"><TextInput value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} /></Field>
          <Field label="Trade name"><TextInput value={form.tradeName} onChange={(e) => updateField("tradeName", e.target.value)} /></Field>
          <Field label="State"><TextInput value={form.state} onChange={(e) => updateField("state", e.target.value)} /></Field>
          <Field label="City"><TextInput value={form.city} onChange={(e) => updateField("city", e.target.value)} /></Field>
          <Field label="Registered address"><Textarea value={form.registeredAddress} onChange={(e) => updateField("registeredAddress", e.target.value)} rows={3} /></Field>
          <Field label="Pincode"><TextInput value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} /></Field>
        </div>
      ) : null}

      {activeStep.key === "basic_information" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Contact person" required><TextInput value={form.contactPersonName} onChange={(e) => updateField("contactPersonName", e.target.value)} /></Field>
          <Field label="Designation" required><TextInput value={form.designation} onChange={(e) => updateField("designation", e.target.value)} /></Field>
          <Field label="Business email" required><TextInput value={form.businessEmail} onChange={(e) => updateField("businessEmail", e.target.value)} /></Field>
          <Field label="Mobile number" required><TextInput value={form.mobileNumber} onChange={(e) => updateField("mobileNumber", e.target.value)} /></Field>
          <div className="md:col-span-2">
            <Field label="Factory address" required><Textarea value={form.factoryAddress} onChange={(e) => updateField("factoryAddress", e.target.value)} rows={3} /></Field>
          </div>
          <Agreement label="Factory address same as registered address" checked={form.factorySameAsRegistered} onChange={(value) => {
            updateField("factorySameAsRegistered", value);
            if (value) updateField("factoryAddress", form.registeredAddress);
          }} />
          <Agreement label="Mobile verified" checked={form.mobileVerified} onChange={(value) => updateField("mobileVerified", value)} />
        </div>
      ) : null}

      {activeStep.key === "business_details" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Seller type" required><NativeSelect value={form.sellerType} onChange={(value) => updateField("sellerType", value)} options={SELLER_TYPES} /></Field>
          <Field label="Main industry" required><TextInput value={form.mainIndustry} onChange={(e) => updateField("mainIndustry", e.target.value)} /></Field>
          <div className="md:col-span-2"><Field label="Capability categories" required><MultiSelectChips options={CAPABILITY_CATEGORIES} value={form.capabilityCategories} onChange={(value) => updateField("capabilityCategories", value)} /></Field></div>
          <div className="md:col-span-2"><Field label="Sub capabilities" required><MultiSelectChips options={availableSubCapabilities(form.capabilityCategories)} value={form.subCapabilities.map((item) => item.name)} onChange={(value) => updateField("subCapabilities", value.map((name) => ({ categoryName: findSubCapabilityCategory(name), name })))} /></Field></div>
          <div className="md:col-span-2"><Field label="Materials" required><MultiSelectChips options={MATERIAL_OPTIONS} value={form.materials} onChange={(value) => updateField("materials", value)} /></Field></div>
          <Field label="Monthly capacity" required><TextInput value={form.monthlyCapacity} onChange={(e) => updateField("monthlyCapacity", e.target.value)} /></Field>
          <Field label="MOQ" required><TextInput value={form.moq} onChange={(e) => updateField("moq", e.target.value)} /></Field>
          <Field label="Lead time" required><TextInput value={form.leadTime} onChange={(e) => updateField("leadTime", e.target.value)} /></Field>
          <Field label="Factory area" required><TextInput value={form.factoryArea} onChange={(e) => updateField("factoryArea", e.target.value)} /></Field>
          <Field label="Shop floor employees" required><TextInput value={form.shopFloorEmployees} onChange={(e) => updateField("shopFloorEmployees", e.target.value)} /></Field>
          <Field label="Engineers" required><TextInput value={form.engineers} onChange={(e) => updateField("engineers", e.target.value)} /></Field>
          <Field label="QC team size" required><TextInput value={form.qcTeamSize} onChange={(e) => updateField("qcTeamSize", e.target.value)} /></Field>
          <Field label="Countries exporting to"><TextInput value={form.countriesExportingTo.join(", ")} onChange={(e) => updateField("countriesExportingTo", splitCsv(e.target.value))} /></Field>
          <div className="md:col-span-2"><Field label="Languages supported"><MultiSelectChips options={LANGUAGE_OPTIONS} value={form.languagesSupported} onChange={(value) => updateField("languagesSupported", value)} /></Field></div>
        </div>
      ) : null}

      {activeStep.key === "bank_financial_verification" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Bank name" required><TextInput value={form.bankName} onChange={(e) => updateField("bankName", e.target.value)} /></Field>
          <Field label="Account holder name" required><TextInput value={form.accountHolderName} onChange={(e) => updateField("accountHolderName", e.target.value)} /></Field>
          <Field label="Account number" required><TextInput value={form.accountNumber} onChange={(e) => updateField("accountNumber", e.target.value)} /></Field>
          <Field label="Confirm account number" required><TextInput value={form.confirmAccountNumber} onChange={(e) => updateField("confirmAccountNumber", e.target.value)} /></Field>
          <Field label="IFSC code" required><TextInput value={form.ifscCode} onChange={(e) => updateField("ifscCode", e.target.value.toUpperCase())} /></Field>
          <Field label="Branch name" required><TextInput value={form.branchName} onChange={(e) => updateField("branchName", e.target.value)} /></Field>
          <Field label="PAN number" required><TextInput value={form.panNumber} onChange={(e) => updateField("panNumber", e.target.value.toUpperCase())} /></Field>
          <Field label="IEC number"><TextInput value={form.iecNumber} onChange={(e) => updateField("iecNumber", e.target.value)} /></Field>
          <Field label="Udyam number"><TextInput value={form.msmeNumber} onChange={(e) => updateField("msmeNumber", e.target.value)} /></Field>
          <Agreement label="Bank verified" checked={form.bankVerified} onChange={(value) => updateField("bankVerified", value)} />
          <Agreement label="PAN uploaded" checked={form.panUploaded} onChange={(value) => updateField("panUploaded", value)} />
          <Agreement label="Factory license uploaded" checked={form.factoryLicenseUploaded} onChange={(value) => updateField("factoryLicenseUploaded", value)} />
          <Agreement label="Seller Agreement" checked={form.sellerAgreement} onChange={(value) => updateField("sellerAgreement", value)} />
          <Agreement label="Terms and Conditions" checked={form.termsAccepted} onChange={(value) => updateField("termsAccepted", value)} />
          <Agreement label="Privacy Policy" checked={form.privacyAccepted} onChange={(value) => updateField("privacyAccepted", value)} />
          <Agreement label="KYC Consent" checked={form.kycConsent} onChange={(value) => updateField("kycConsent", value)} />
        </div>
      ) : null}

      {activeStep.key === "registration_complete" ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-bold text-slate-950">Business account created</h3>
          <p className="mt-2 text-sm text-slate-600">Profile completion is {completion.overallPercent}%. Complete the remaining profile sections to increase visibility, rank higher in search, receive RFQs, and qualify for verified badges.</p>
          {!gate.canActivate ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-800"><ShieldAlert className="h-4 w-4" /> Activation requirements</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
                {gate.missingRequirements.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeStep.key === "profile_completion" ? (
        <div className="mt-6 space-y-6">
          <div>
            <Field label="Company description"><Textarea value={form.companyDescription} onChange={(e) => updateField("companyDescription", e.target.value)} rows={3} /></Field>
          </div>
          <div><Field label="Factory photos"><MultiSelectChips options={FACTORY_PHOTO_CATEGORIES} value={form.factoryPhotos.map((item) => item.category)} onChange={(value) => updateField("factoryPhotos", value.map((category) => ({ category, fileUrl: "pending-upload" })))} /></Field></div>
          <MachinesEditor rows={form.machines} onChange={(rows) => updateField("machines", rows)} />
          <CertificationsEditor rows={form.certifications} onChange={(rows) => updateField("certifications", rows)} />
          <ExportEditor rows={form.exportExperience} onChange={(rows) => updateField("exportExperience", rows)} />
          <Field label="Quality systems"><MultiSelectChips options={QUALITY_SYSTEM_OPTIONS} value={form.qualitySystems} onChange={(value) => updateField("qualitySystems", value)} /></Field>
          <Field label="Factory tour URL"><TextInput value={form.factoryTourUrl} onChange={(e) => updateField("factoryTourUrl", e.target.value)} /></Field>
        </div>
      ) : null}

      <WizardActions
        saving={saving}
        canBack={activeIndex > 0}
        canNext
        submitLabel={activeIndex === SELLER_ONBOARDING_V3_STEPS.length - 1 ? "Submit for review" : undefined}
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

function MachinesEditor({ rows, onChange }: { rows: MachineRow[]; onChange: (rows: MachineRow[]) => void }) {
  return <SimpleRows title="Machines" rows={rows} onChange={onChange} blank={{ machineName: "", brand: "", model: "", quantity: "1", capacity: "", yearPurchased: "" }} fields={["machineName", "brand", "model", "quantity", "capacity", "yearPurchased"]} />;
}

function CertificationsEditor({ rows, onChange }: { rows: CertificationRow[]; onChange: (rows: CertificationRow[]) => void }) {
  return <SimpleRows title="Certifications" rows={rows} onChange={onChange} blank={{ certificateName: "", certificateNumber: "", expiryDate: "" }} fields={["certificateName", "certificateNumber", "expiryDate"]} />;
}

function ExportEditor({ rows, onChange }: { rows: ExportRow[]; onChange: (rows: ExportRow[]) => void }) {
  return <SimpleRows title="Export experience" rows={rows} onChange={onChange} blank={{ customerName: "", country: "", productExported: "", orderValue: "" }} fields={["customerName", "country", "productExported", "orderValue"]} />;
}

function SimpleRows<T extends Record<string, string>>({
  title,
  rows,
  blank,
  fields,
  onChange,
}: {
  title: string;
  rows: T[];
  blank: T;
  fields: Array<keyof T>;
  onChange: (rows: T[]) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-950">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, blank])}>Add</Button>
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-3">
            {fields.map((field) => (
              <TextInput
                key={String(field)}
                value={row[field]}
                placeholder={String(field).replace(/([A-Z])/g, " $1")}
                onChange={(event) => {
                  const next = rows.slice();
                  next[index] = { ...row, [field]: event.target.value };
                  onChange(next);
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function availableSubCapabilities(categories: string[]) {
  const values = categories.flatMap((category) => SUB_CAPABILITIES[category] ?? []);
  return values.length ? values : ["General Manufacturing"];
}

function findSubCapabilityCategory(name: string) {
  for (const [category, options] of Object.entries(SUB_CAPABILITIES)) {
    if (options.includes(name)) return category;
  }
  return "General";
}
