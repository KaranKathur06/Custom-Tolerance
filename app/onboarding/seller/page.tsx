"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, Loader2, Phone, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OtpInput, OTP_LENGTH_EXPORT } from "@/components/auth/OtpInput";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Field,
  WizardActions,
  WizardShell,
  type OnboardingErrorType,
} from "@/components/onboarding/OnboardingV3Wizard";
import {
  SELLER_ONBOARDING_V3_STEPS,
  calculateSellerOnboardingV3Completion,
  getSellerV3HardGateStatus,
} from "@/lib/marketplace/onboarding-v3";
import {
  getMissingFieldsMessage,
  validateSellerOnboardingStep,
  SELLER_DOCUMENT_TYPE_KEYS,
  type SellerUploadAsset,
} from "@/lib/marketplace/seller-onboarding-validation";
import { fetchSellerAssets } from "@/lib/marketplace/seller-upload-client";
import { CompanyVerificationStep } from "@/components/onboarding/seller/CompanyVerificationStep";
import { BasicInformationStep } from "@/components/onboarding/seller/BasicInformationStep";
import { BusinessDetailsStep } from "@/components/onboarding/seller/BusinessDetailsStep";
import { BankDetailsStep } from "@/components/onboarding/seller/BankDetailsStep";
import { RegistrationCompleteStep } from "@/components/onboarding/seller/RegistrationCompleteStep";
import type { MachineRow, CertificationRow, ExportRow } from "@/components/onboarding/seller/types";

type MobileTrustStatus = "pending" | "otp_sent" | "verified" | "failed";
type MobileStatusPayload = {
  status: MobileTrustStatus;
  verified: boolean;
  maskedMobile?: string;
  expiresInSeconds?: number;
  cooldownSeconds?: number;
  remainingAttempts?: number;
  resendCount?: number;
  developmentOtp?: string;
  message?: string;
};

type SellerForm = Record<string, unknown> & {
  countryOrigin: string;
  verificationRegion: string;

  gstNumber: string;
  gstVerified: boolean;
  companyVerificationVerified: boolean;

  gstProvider: string;
  gstDetails: Record<string, unknown>;
  companyName: string;
  legalBusinessName: string;

  // Structured registered address
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;

  // International verification
  verificationType: string;
  companyRegistrationNumber: string;
  countryOfRegistration: string;

  // Contact
  contactPersonName: string;
  designation: string;
  mobileNumber: string;
  businessEmail: string;
  website: string;
  linkedinUrl: string;
  whatsapp: string;

  // Structured factory address
  factoryAddressLine1: string;
  factoryAddressLine2: string;
  factoryCity: string;
  factoryState: string;
  factoryPostalCode: string;
  factorySameAsRegistered: boolean;

  emailVerified: boolean;
  mobileVerified: boolean;

  // Business identity
  businessNature: string;
  sellerTypeOther: string;

  // Seller types (multi-select)
  sellerTypes: string[];

  // New intelligence fields
  industriesServed: string[];
  capabilities: string[];
  buyerServices: string[];
  supplierInterests: string[];
  yearsInBusiness: string;

  // Video URLs (replaces file upload)
  videoUrls: string[];

  // Legacy products (kept for backward compat — shown in Dashboard now)
  products: unknown[];

  // R&D
  hasRdTeam: boolean;
  rdTeamSize: string;
  rdServices: string[];
  innovationReady: boolean;

  // Factory & Team
  factoryAreaValue: string;
  factoryAreaUnit: string;
  totalEmployees: string;
  engineers: string;
  qcTeamSize: string;
  countriesExportingTo: string[];
  languagesSupported: string[];

  // Legacy capability fields
  capabilityCategories: string[];
  subCapabilities: Array<{ categoryName: string; name: string }>;
  materials: string[];
  monthlyCapacity: string;
  moq: string;
  leadTime: string;
  factoryArea: string;
  shopFloorEmployees: string;

  // Bank
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  branchName: string;
  panNumber: string;
  iecNumber: string;
  msmeNumber: string;
  dunsNumber: string;
  routingNumber: string;
  swiftCode: string;
  iban: string;
  sortCode: string;
  bicCode: string;

  // Agreements
  sellerAgreement: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  kycConsent: boolean;

  // Content
  companyDescription: string;
  factoryPhotos: Array<{ category: string; fileUrl?: string; id?: string; storagePath?: string }>;
  machines: MachineRow[];
  certifications: CertificationRow[];
  exportExperience: ExportRow[]; // kept for backward compat, not shown in UI
  qualitySystems: string[];
  factoryTourUrl: string;
  factoryTourVideoId?: string;

  // Production capacity
  productionCapacityUnit: string;

  // Document IDs
  cancelledChequeDocumentId?: string;
  gstCertificateDocumentId?: string;
  panCardDocumentId?: string;
  factoryLicenseDocumentId?: string;
  iecCertificateDocumentId?: string;
  udyamCertificateDocumentId?: string;
  dunsCertificateDocumentId?: string;
  verificationCertificateDocumentId?: string;
};

const initialForm: SellerForm = {
  countryOrigin: "",
  verificationRegion: "GLOBAL_DEFAULT",

  gstNumber: "",
  gstVerified: false,
  companyVerificationVerified: false,

  gstProvider: "",
  gstDetails: {},
  companyName: "",
  legalBusinessName: "",

  // Structured registered address
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",

  // International verification
  verificationType: "",
  companyRegistrationNumber: "",
  countryOfRegistration: "",

  // Contact
  contactPersonName: "",
  designation: "",
  mobileNumber: "",
  businessEmail: "",
  website: "",
  linkedinUrl: "",
  whatsapp: "",

  // Structured factory address
  factoryAddressLine1: "",
  factoryAddressLine2: "",
  factoryCity: "",
  factoryState: "",
  factoryPostalCode: "",
  factorySameAsRegistered: false,

  emailVerified: false,
  mobileVerified: false,

  // Business identity
  businessNature: "",
  sellerTypeOther: "",

  // Seller types
  sellerTypes: [],

  // New intelligence fields
  industriesServed: [],
  capabilities: [],
  buyerServices: [],
  supplierInterests: [],
  yearsInBusiness: "",

  // Video URLs
  videoUrls: [],

  // Legacy products (shown in Dashboard)
  products: [],

  // R&D
  hasRdTeam: false,
  rdTeamSize: "",
  rdServices: [],
  innovationReady: false,

  // Factory & Team
  factoryAreaValue: "",
  factoryAreaUnit: "sq.m",
  totalEmployees: "",
  engineers: "",
  qcTeamSize: "",
  countriesExportingTo: [],
  languagesSupported: [],

  // Legacy capability fields
  capabilityCategories: [],
  subCapabilities: [],
  materials: [],
  monthlyCapacity: "",
  moq: "",
  leadTime: "",
  factoryArea: "",
  shopFloorEmployees: "",

  // Bank
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  branchName: "",
  panNumber: "",
  iecNumber: "",
  msmeNumber: "",
  dunsNumber: "",
  routingNumber: "",
  swiftCode: "",
  iban: "",
  sortCode: "",
  bicCode: "",

  // Agreements
  sellerAgreement: false,
  termsAccepted: false,
  privacyAccepted: false,
  kycConsent: false,

  // Content
  companyDescription: "",
  factoryPhotos: [],
  machines: [],
  certifications: [],
  exportExperience: [],
  qualitySystems: [],
  factoryTourUrl: "",

  // Production capacity
  productionCapacityUnit: "pcs",

  // Privacy visibility
  emailVisibility: "MEMBERS_ONLY",
  mobileVisibility: "PRIVATE",
  whatsappVisibility: "PRIVATE",
  websiteVisibility: "PUBLIC",
  linkedinVisibility: "PUBLIC",
  factoryAddressVisibility: "MEMBERS_ONLY",
  gstVisibility: "PUBLIC",
};

export default function SellerOnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, loading, profile, user } = useAuth();
  const [form, setForm] = useState<SellerForm>(initialForm);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalErrorType, setGlobalErrorType] = useState<OnboardingErrorType>("generic");
  const [gstError, setGstError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validatedSteps, setValidatedSteps] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Record<string, SellerUploadAsset | undefined>>({});
  const [images, setImages] = useState<Record<string, SellerUploadAsset[]>>({});
  const [video, setVideo] = useState<SellerUploadAsset | null>(null);
  const [mobileStatus, setMobileStatus] = useState<MobileStatusPayload>({
    status: "pending",
    verified: false,
    expiresInSeconds: 0,
    cooldownSeconds: 0,
    remainingAttempts: 5,
    resendCount: 0,
  });
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileOtpError, setMobileOtpError] = useState<string | null>(null);
  const [sendingMobileOtp, setSendingMobileOtp] = useState(false);
  const [verifyingMobileOtp, setVerifyingMobileOtp] = useState(false);
  const [mobileSuccess, setMobileSuccess] = useState<string | null>(null);

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
      try {
        const [sessionResponse, assets] = await Promise.all([
          fetch("/api/onboarding/seller", { credentials: "include" }),
          fetchSellerAssets(true),
        ]);
        if (!sessionResponse.ok) return;
        // Safe JSON parse for session
        let sessionPayload: Record<string, unknown> | null = null;
        try {
          const text = await sessionResponse.text();
          if (text) sessionPayload = JSON.parse(text);
        } catch {
          return;
        }
        if (!sessionPayload) return;
        const session = sessionPayload.session as Record<string, unknown> | null;
        if (session?.draft_payload && typeof session.draft_payload === "object") {
          setForm((prev) => ({ ...prev, ...(session.draft_payload as Record<string, unknown>), mobileVerified: false }));
        }
        if (Array.isArray(session?.validated_steps)) {
          setValidatedSteps(session!.validated_steps as string[]);
        }
        normalizeAssets(assets);
      } catch {
        // ignore — assets endpoint returns friendly errors
      }
    })();
  }, []);

  useEffect(() => {
    if (!isValidMobileNumber(form.mobileNumber)) {
      setMobileStatus((prev) => ({
        ...prev,
        status: "pending",
        verified: false,
        maskedMobile: "",
        expiresInSeconds: 0,
      }));
      setForm((prev) => (prev.mobileVerified ? { ...prev, mobileVerified: false } : prev));
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        let response: Response;
        try {
          response = await fetch(
            `/api/onboarding/mobile/status?countryCode=%2B91&mobileNumber=${encodeURIComponent(form.mobileNumber)}`,
            { credentials: "include" },
          );
        } catch {
          return;
        }
        if (!response.ok) return;
        const payload = await safeParseJson<MobileStatusPayload>(response);
        if (!payload) return;
        setMobileStatus((prev) => ({ ...prev, ...payload }));
        setForm((prev) => ({ ...prev, mobileVerified: Boolean(payload.verified) }));
      } catch {
        setMobileStatus((prev) => ({ ...prev, status: "failed", verified: false }));
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [form.mobileNumber]);

  useEffect(() => {
    if (!mobileModalOpen) return;
    const timer = window.setInterval(() => {
      setMobileStatus((prev) => ({
        ...prev,
        expiresInSeconds: Math.max(0, (prev.expiresInSeconds ?? 0) - 1),
        cooldownSeconds: Math.max(0, (prev.cooldownSeconds ?? 0) - 1),
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mobileModalOpen]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      cancelledChequeDocumentId: documents[SELLER_DOCUMENT_TYPE_KEYS.cancelledCheque]?.id,
      gstCertificateDocumentId: documents[SELLER_DOCUMENT_TYPE_KEYS.gstCertificate]?.id,
      panCardDocumentId: documents[SELLER_DOCUMENT_TYPE_KEYS.panCard]?.id,
      factoryLicenseDocumentId: documents[SELLER_DOCUMENT_TYPE_KEYS.factoryLicense]?.id,
      iecCertificateDocumentId: documents[SELLER_DOCUMENT_TYPE_KEYS.iecCertificate]?.id,
      udyamCertificateDocumentId: documents[SELLER_DOCUMENT_TYPE_KEYS.udyamCertificate]?.id,
      dunsCertificateDocumentId: documents[SELLER_DOCUMENT_TYPE_KEYS.dunsCertificate]?.id,
      factoryPhotos: Object.values(images)
        .flat()
        .map((img) => ({
          category: img.category || "general",
          fileUrl: img.publicUrl || img.signedUrl || undefined,
          id: img.id,
          storagePath: img.storagePath,
        })),
      factoryTourVideoId: video?.id,
    }));
  }, [documents, images, video]);

  const valuesForCompletion = useMemo(() => form, [form]);
  const completion = useMemo(() => calculateSellerOnboardingV3Completion(valuesForCompletion, validatedSteps), [valuesForCompletion, validatedSteps]);
  const gate = useMemo(() => getSellerV3HardGateStatus(valuesForCompletion), [valuesForCompletion]);
  const activeStep = SELLER_ONBOARDING_V3_STEPS[activeIndex];

  const normalizeAssets = (assets: {
    documents: Record<string, SellerUploadAsset | SellerUploadAsset[]>;
    images: Record<string, SellerUploadAsset[]>;
    video: SellerUploadAsset | null;
  }) => {
    const normalizedDocs: Record<string, SellerUploadAsset | undefined> = {};
    for (const [key, value] of Object.entries(assets.documents)) {
      normalizedDocs[key] = Array.isArray(value) ? value[0] : value;
    }
    setDocuments(normalizedDocs);
    setImages(assets.images || {});
    setVideo(assets.video);
  };

  const updateField = (field: keyof SellerForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateDocument = (documentType: string, asset: SellerUploadAsset | null) => {
    setDocuments((prev) => ({ ...prev, [documentType]: asset ?? undefined }));
  };

  const updateImages = (category: string, value: SellerUploadAsset[]) => {
    setImages((prev) => ({ ...prev, [category]: value }));
  };

  const updateVideo = (value: SellerUploadAsset | null) => {
    setVideo(value);
  };

  const updateVideoUrl = (url: string) => {
    setForm((prev) => ({ ...prev, factoryTourUrl: url }));
  };

  const scrollToFirstError = () => {
    window.setTimeout(() => {
      const firstError = document.querySelector(".border-red-300, [aria-invalid='true']");
      if (firstError && firstError instanceof HTMLElement) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        firstError.focus();
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  };

  const verifyGst = async () => {
    setVerifyingGst(true);
    setGlobalError(null);
    setGstError(null);
    setGlobalErrorType("generic");
    try {
      let response: Response;
      try {
        response = await fetch("/api/onboarding/seller/gst/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            gstNumber: form.gstNumber,
            legalName: form.legalBusinessName,
            state: form.state,
          }),
        });
      } catch {
        setGstError("network");
        setGlobalErrorType("network");
        setGlobalError("Unable to connect to server. Please check your internet connection.");
        return;
      }

      let payload: Record<string, unknown> | null = null;
      try {
        const text = await response.text();
        if (text) payload = JSON.parse(text);
      } catch {
        // Invalid JSON
      }

      if (!response.ok) {
        setGstError("api");
        setGlobalErrorType("gst_api");
        setGlobalError("Unable to verify GST right now. Please try again in a few minutes.");
        return;
      }

      if (!payload) {
        setGstError("api");
        setGlobalErrorType("gst_api");
        setGlobalError("Unable to verify GST right now. Please try again in a few minutes.");
        return;
      }

      const data = payload.data as Record<string, unknown>;
      const lookup = (data?.lookup ?? {}) as Record<string, unknown>;
      setForm((prev) => ({
        ...prev,
        gstVerified: Boolean(data?.isVerified),
        companyVerificationVerified: Boolean(data?.isVerified),
        gstProvider: data?.developmentMode ? "development_trust_mode" : "live_provider",
        gstDetails: lookup,
        legalBusinessName: (lookup.legalName as string) ?? prev.legalBusinessName,
        companyName: (lookup.tradeName as string) ?? (lookup.legalName as string) ?? prev.companyName,
        state: (lookup.gstState as string) ?? prev.state,
      }));
      setGstError(null);
    } catch {
      setGstError("api");
      setGlobalErrorType("gst_api");
      setGlobalError("Unable to verify GST right now. Please try again in a few minutes.");
    } finally {
      setVerifyingGst(false);
    }
  };

  const save = async (action: "save" | "submit") => {
    setSaving(true);
    setGlobalError(null);
    setGlobalErrorType("generic");
    setFieldErrors({});
    try {
      let response: Response;
      try {
        response = await fetch("/api/onboarding/seller", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            action,
            stepKey: activeStep.key,
            values: { form, documents, images, video },
          }),
        });
      } catch {
        setGlobalErrorType("network");
        setGlobalError("Unable to connect to server. Please check your internet connection.");
        return false;
      }

      let payload: Record<string, unknown> | null = null;
      try {
        const text = await response.text();
        if (text) payload = JSON.parse(text);
      } catch {
        // Invalid JSON from server
      }

      if (!response.ok) {
        if (payload && payload.error === "VALIDATION_ERROR" && Array.isArray(payload.fieldErrors)) {
          const errors: Record<string, string> = {};
          for (const item of payload.fieldErrors as Array<{ field: string; message: string }>) {
            errors[item.field] = item.message;
          }
          setFieldErrors(errors);
          setGlobalErrorType("validation");
          setGlobalError(
            typeof payload.message === "string" ? payload.message : "Please complete all required fields before continuing.",
          );
        } else if (response.status >= 500) {
          setGlobalErrorType("server");
          setGlobalError(
            typeof payload?.message === "string"
              ? (payload.message as string)
              : "Something went wrong while saving your onboarding. Your information has not been lost. Please try again.",
          );
        } else if (response.status === 401) {
          setGlobalErrorType("generic");
          setGlobalError("Your session has expired. Please log in again.");
        } else {
          setGlobalErrorType("generic");
          setGlobalError(
            typeof payload?.message === "string"
              ? (payload.message as string)
              : "Failed to save seller onboarding. Please try again.",
          );
        }
        return false;
      }
      if (payload && typeof payload === "object" && payload.session) {
        const session = payload.session as Record<string, unknown>;
        if (Array.isArray(session.validated_steps)) {
          setValidatedSteps(session.validated_steps as string[]);
        }
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    // registration_complete has no Next button — handled by RegistrationCompleteStep CTAs
    if (activeStep.key === "registration_complete") return;

    const validation = validateSellerOnboardingStep(activeStep.key, { form, documents, images, video });
    if (!validation.valid) {
      const errors: Record<string, string> = {};
      for (const item of validation.fieldErrors) {
        errors[item.field] = item.message;
      }
      setFieldErrors(errors);
      setGlobalError(getMissingFieldsMessage(validation));
      scrollToFirstError();
      return;
    }

    setFieldErrors({});
    setGlobalError(null);

    const isLast = activeIndex === SELLER_ONBOARDING_V3_STEPS.length - 1;
    const ok = await save(isLast ? "submit" : "submit");
    if (!ok) {
      scrollToFirstError();
      return;
    }
    if (isLast) {
      router.push("/dashboard/seller?submitted=1");
    } else {
      setActiveIndex((index) => index + 1);
    }
  };

  const saveDraft = async () => {
    const ok = await save("save");
    if (ok) {
      setGlobalError(null);
    }
  };

  const sendMobileOtp = async () => {
    if (!isValidMobileNumber(form.mobileNumber)) return;
    setSendingMobileOtp(true);
    setMobileOtpError(null);
    setMobileSuccess(null);
    try {
      let response: Response;
      try {
        response = await fetch("/api/onboarding/mobile/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ countryCode: "+91", mobileNumber: form.mobileNumber }),
        });
      } catch {
        setMobileStatus((prev) => ({ ...prev, status: "failed", verified: false }));
        setMobileOtpError("Unable to connect to server. Please check your internet connection.");
        setMobileModalOpen(true);
        return;
      }
      const payload = (await safeParseJson(response)) as MobileStatusPayload & { error?: string };
      if (!response.ok) {
        setMobileStatus((prev) => ({ ...prev, status: "failed", verified: false }));
        setMobileOtpError(payload?.error ?? "Unable to send OTP.");
        setMobileModalOpen(true);
        return;
      }
      setMobileStatus((prev) => ({ ...prev, ...payload, status: "otp_sent", verified: false }));
      setMobileOtp("");
      setMobileModalOpen(true);
    } catch (err) {
      setMobileStatus((prev) => ({ ...prev, status: "failed", verified: false }));
      setMobileOtpError(err instanceof Error ? err.message : "Unable to send OTP.");
      setMobileModalOpen(true);
    } finally {
      setSendingMobileOtp(false);
    }
  };

  const verifyMobileOtp = async () => {
    if (mobileOtp.length !== OTP_LENGTH_EXPORT) return;
    setVerifyingMobileOtp(true);
    setMobileOtpError(null);
    try {
      let response: Response;
      try {
        response = await fetch("/api/onboarding/mobile/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ countryCode: "+91", mobileNumber: form.mobileNumber, otp: mobileOtp }),
        });
      } catch {
        setMobileOtpError("Unable to connect to server. Please check your internet connection.");
        return;
      }
      const payload = (await safeParseJson(response)) as MobileStatusPayload & { error?: string };
      if (!response.ok) {
        setMobileStatus((prev) => ({
          ...prev,
          status: response.status === 429 ? "failed" : prev.status,
          verified: false,
          remainingAttempts: Math.max(0, (prev.remainingAttempts ?? 5) - 1),
        }));
        setMobileOtpError(payload?.error ?? "Invalid OTP.");
        return;
      }
      setMobileStatus((prev) => ({ ...prev, ...payload, status: "verified", verified: true }));
      setForm((prev) => ({ ...prev, mobileVerified: true }));
      setMobileModalOpen(false);
      setMobileOtp("");
      setMobileSuccess("Mobile Verified Successfully");
    } catch (err) {
      setMobileOtpError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setVerifyingMobileOtp(false);
    }
  };

  const changeMobileNumber = async () => {
    const previousNumber = form.mobileNumber;
    setMobileSuccess(null);
    setMobileOtpError(null);
    setMobileOtp("");
    setMobileStatus({
      status: "pending",
      verified: false,
      expiresInSeconds: 0,
      cooldownSeconds: 0,
      remainingAttempts: 5,
      resendCount: 0,
    });
    setForm((prev) => ({ ...prev, mobileVerified: false }));
    if (previousNumber) {
      await fetch("/api/onboarding/mobile/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ countryCode: "+91", mobileNumber: previousNumber }),
      }).catch(() => undefined);
    }
  };

  const updateMobileNumber = (value: string) => {
    setMobileSuccess(null);
    setMobileOtpError(null);
    setForm((prev) => ({
      ...prev,
      mobileNumber: value,
      mobileVerified: prev.mobileNumber === value ? prev.mobileVerified : false,
    }));
    if (form.mobileNumber !== value) {
      setMobileStatus({
        status: "pending",
        verified: false,
        expiresInSeconds: 0,
        cooldownSeconds: 0,
        remainingAttempts: 5,
        resendCount: 0,
      });
    }
  };

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
        <p className="mb-4 text-slate-600">Login to complete seller onboarding.</p>
        <Link href="/login?redirect=/onboarding/seller">
          <Button>Login</Button>
        </Link>
      </div>
    );
  }

  const mobileSection = (
    <MobileVerificationField
      mobileNumber={form.mobileNumber}
      status={mobileStatus}
      successMessage={mobileSuccess}
      sending={sendingMobileOtp}
      onMobileChange={updateMobileNumber}
      onVerify={() => void sendMobileOtp()}
      onChangeNumber={() => void changeMobileNumber()}
      error={fieldErrors.mobileNumber}
    />
  );

  const stepProps = {
    form,
    errors: fieldErrors,
    documents,
    images,
    video,
    onFieldChange: (field: string, value: unknown) => updateField(field as keyof SellerForm, value),
    onDocumentChange: updateDocument,
    onImagesChange: updateImages,
    onVideoChange: updateVideo,
    onVideoUrlChange: updateVideoUrl,
  };

  return (
    <WizardShell
      title="Seller verification"
      subtitle="Verify your business identity and complete your seller profile for marketplace activation."
      steps={SELLER_ONBOARDING_V3_STEPS}
      activeStep={activeStep.key}
      completion={completion}
      validatedSteps={validatedSteps}
      globalError={globalError}
      globalErrorType={globalErrorType}
      onClearGlobalError={() => {
        setGlobalError(null);
        setGlobalErrorType("generic");
      }}
      onRetry={() => {
        if (globalErrorType === "gst_api" || activeStep.key === "company_verification") {
          void verifyGst();
          return;
        }
        void next();
      }}
      onSaveDraft={() => void saveDraft()}
      onStepClick={(stepKey) => {
        const idx = SELLER_ONBOARDING_V3_STEPS.findIndex((s) => s.key === stepKey);
        if (idx >= 0) setActiveIndex(idx);
      }}
      trustItems={[
        { label: "Company", verified: Boolean(form.gstVerified || form.companyVerificationVerified || form.verificationCertificateDocumentId) },
        { label: "Email", verified: form.emailVerified },
        { label: "Mobile", status: mobileStatus.status },
        { label: "Bank", verified: Boolean(form.cancelledChequeDocumentId) },
      ]}
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950">{activeStep.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{activeStep.goal}</p>
      </div>

      {activeStep.key === "company_verification" ? (
        <CompanyVerificationStep
          {...stepProps}
          onVerifyGst={() => void verifyGst()}
          verifyingGst={verifyingGst}
          gstError={gstError}
          onRetryGst={() => void verifyGst()}
        />
      ) : null}

      {activeStep.key === "basic_information" ? (
        <BasicInformationStep {...stepProps} mobileSection={mobileSection} />
      ) : null}

      {activeStep.key === "registration_complete" ? (
        <RegistrationCompleteStep
          form={form}
          completion={completion}
          gate={gate}
          onCompleteProfile={() => {
            setActiveIndex((index) => Math.min(SELLER_ONBOARDING_V3_STEPS.length - 1, index + 1));
          }}
          onSkipForNow={() => {
            void (async () => {
              await save("submit");
              router.push("/dashboard/seller?submitted=1");
            })();
          }}
        />
      ) : null}

      {activeStep.key === "business_details" ? <BusinessDetailsStep {...stepProps} /> : null}

      {activeStep.key === "bank_details" ? <BankDetailsStep {...stepProps} /> : null}

      <WizardActions
        saving={saving}
        canBack={activeIndex > 0 && activeStep.key !== "registration_complete"}
        canNext={activeStep.key !== "registration_complete"}
        submitLabel={activeIndex === SELLER_ONBOARDING_V3_STEPS.length - 1 ? "Submit for review" : undefined}
        onBack={() => setActiveIndex((index) => Math.max(0, index - 1))}
        onSave={() => void saveDraft()}
        onNext={() => void next()}
      />

      {mobileModalOpen ? (
        <MobileOtpModal
          mobileNumber={form.mobileNumber}
          status={mobileStatus}
          otp={mobileOtp}
          error={mobileOtpError}
          verifying={verifyingMobileOtp}
          resending={sendingMobileOtp}
          onOtpChange={setMobileOtp}
          onCancel={() => setMobileModalOpen(false)}
          onVerify={() => void verifyMobileOtp()}
          onResend={() => void sendMobileOtp()}
        />
      ) : null}
    </WizardShell>
  );
}

function MobileVerificationField({
  mobileNumber,
  status,
  successMessage,
  sending,
  onMobileChange,
  onVerify,
  onChangeNumber,
  error,
}: {
  mobileNumber: string;
  status: MobileStatusPayload;
  successMessage: string | null;
  sending: boolean;
  onMobileChange: (value: string) => void;
  onVerify: () => void;
  onChangeNumber: () => void;
  error?: string;
}) {
  const verified = status.verified || status.status === "verified";
  const canVerify = isValidMobileNumber(mobileNumber) && !verified && !sending;

  return (
    <div className="space-y-2">
      <Field label="Mobile number" required error={error}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={mobileNumber}
            inputMode="tel"
            placeholder="+91 9876543210"
            readOnly={verified}
            onChange={(e) => onMobileChange(e.target.value)}
            className={cn(
              "h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600",
              verified ? "bg-slate-50 text-slate-700" : "",
              error ? "border-red-300" : "border-slate-200",
            )}
          />
          {verified ? (
            <div className="flex gap-2">
              <span className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Verified
              </span>
              <Button type="button" variant="outline" onClick={onChangeNumber} className="border-slate-200">
                Change Number
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={!canVerify}
              onClick={onVerify}
              className="border-blue-700 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
              Verify Mobile
            </Button>
          )}
        </div>
      </Field>
      {verified ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {successMessage ?? "Mobile number verified by secure OTP."}
        </p>
      ) : (
        <p className="text-xs text-slate-500">Pending system verification. Sellers cannot self-certify this trust check.</p>
      )}
    </div>
  );
}

function MobileOtpModal({
  mobileNumber,
  status,
  otp,
  error,
  verifying,
  resending,
  onOtpChange,
  onCancel,
  onVerify,
  onResend,
}: {
  mobileNumber: string;
  status: MobileStatusPayload;
  otp: string;
  error: string | null;
  verifying: boolean;
  resending: boolean;
  onOtpChange: (value: string) => void;
  onCancel: () => void;
  onVerify: () => void;
  onResend: () => void;
}) {
  const expiresInSeconds = status.expiresInSeconds ?? 0;
  const cooldownSeconds = status.cooldownSeconds ?? 0;
  const remainingAttempts = status.remainingAttempts ?? 5;
  const canVerify = otp.length === OTP_LENGTH_EXPORT && !verifying && expiresInSeconds > 0 && remainingAttempts > 0;
  const canResend = cooldownSeconds <= 0 && !resending && !verifying;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[480px] rounded-[14px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex flex-1 justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10">
              <Phone className="h-8 w-8 text-blue-700" />
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close mobile OTP verification"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-900">Mobile OTP Verification</h2>
        <p className="mt-2 text-center text-sm text-slate-600">Enter the OTP sent to</p>
        <p className="mt-1 text-center text-sm font-bold text-slate-900">{formatMobileForDisplay(mobileNumber)}</p>

        {status.developmentOtp ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Development OTP: <span className="font-mono font-bold">{status.developmentOtp}</span>
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mt-8">
          <OtpInput
            value={otp}
            onChange={onOtpChange}
            disabled={verifying || remainingAttempts === 0}
            error={Boolean(error)}
            idPrefix="mobile-otp"
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            <span className={expiresInSeconds <= 60 ? "font-mono font-bold text-red-500" : "font-mono font-bold text-slate-700"}>
              {formatCountdown(expiresInSeconds)}
            </span>
          </span>
          <span>{remainingAttempts} attempts left</span>
        </div>

        {expiresInSeconds <= 0 ? (
          <p className="mt-2 text-xs font-semibold text-red-600">OTP expired. Please request a new OTP.</p>
        ) : null}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={onCancel} disabled={verifying}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onVerify}
            disabled={!canVerify}
            className="bg-slate-950 text-white hover:bg-slate-800"
          >
            {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Verify OTP
          </Button>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onResend}
            disabled={!canResend}
            className={
              canResend
                ? "inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
                : "inline-flex cursor-not-allowed items-center gap-1.5 text-sm font-semibold text-slate-300"
            }
          >
            {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {cooldownSeconds > 0 ? `Resend OTP in ${cooldownSeconds}s` : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

async function safeParseJson<T>(response: Response): Promise<T | null> {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function isValidMobileNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return normalized.length === 10;
}

function formatMobileForDisplay(value: string) {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  if (normalized.length === 10) return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`;
  return value || "+91";
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
