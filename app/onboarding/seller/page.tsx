'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Check, ChevronRight, Factory, FileText, Image,
  Loader2, MapPin, ShieldCheck, Upload, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  fetchCitiesByState,
  fetchCountries,
  fetchStatesByCountry,
  type CityOption,
  type CountryOption,
  type StateOption,
} from '@/lib/marketplace/location-registry';
import {
  SELLER_ONBOARDING_STEPS,
  getSellerOnboardingProgress,
  type SellerOnboardingStepKey,
  type SellerOnboardingState,
} from '@/lib/marketplace/seller-onboarding';
import {
  BUSINESS_TYPES,
  MANUFACTURING_PROCESSES,
  QUALITY_CERTIFICATIONS,
  FACTORY_MEDIA_CATEGORIES,
  buildSupplierProfileDataFromDraft,
  calculateSupplierProfileCompletion,
} from '@/lib/marketplace/supplier-profile-completion';
import { uploadSupplierFile } from '@/lib/supplier/upload-file';

const STEP_ICONS: Record<SellerOnboardingStepKey, typeof Building2> = {
  company_information: Building2,
  address: MapPin,
  capabilities: Wrench,
  factory_information: Factory,
  verification_documents: FileText,
  media_uploads: Image,
  review_submit: ShieldCheck,
};

type CapabilityRow = {
  processName: string;
  materialsSupported: string;
  monthlyCapacity: string;
  machineCount: string;
  toleranceCapability: string;
  maxPartSize: string;
  minPartSize: string;
};

export default function SellerOnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, profile, loading: authLoading, user, supabase } = useAuth();

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [onboardingState, setOnboardingState] = useState<Partial<SellerOnboardingState>>({
    completedSteps: [], skippedSteps: [], draftSteps: [],
  });
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<SellerOnboardingStepKey>('company_information');
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [capabilityRows, setCapabilityRows] = useState<CapabilityRow[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void fetchCountries(supabase).then(setCountries).catch(() => setCountries([]));
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !values.countryId) {
      setStates([]);
      return;
    }
    void fetchStatesByCountry(supabase, values.countryId as string)
      .then(setStates)
      .catch(() => setStates([]));
  }, [supabase, values.countryId]);

  useEffect(() => {
    if (!supabase || !values.stateId) {
      setCities([]);
      return;
    }
    void fetchCitiesByState(supabase, values.stateId as string)
      .then(setCities)
      .catch(() => setCities([]));
  }, [supabase, values.stateId]);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/onboarding/seller', { credentials: 'include' });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.session?.draftPayload) {
        setValues(payload.session.draftPayload);
        if (Array.isArray(payload.session.draftPayload.capabilities)) {
          setCapabilityRows(payload.session.draftPayload.capabilities as CapabilityRow[]);
        }
        if (payload.session.currentStep) {
          setActiveStep(payload.session.currentStep as SellerOnboardingStepKey);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (profile) {
      setValues((prev) => ({
        ...prev,
        fullName: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        emailVerified: Boolean(user?.email_confirmed_at),
      }));
    }
  }, [profile, user]);

  const progress = getSellerOnboardingProgress(
    { ...values, capabilities: capabilityRows },
    onboardingState,
  );

  const completion = calculateSupplierProfileCompletion(
    buildSupplierProfileDataFromDraft({ ...values, capabilities: capabilityRows }),
  );

  const updateField = useCallback((field: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveStep = async (markComplete: boolean) => {
    setSaving(true);
    const payload = { ...values, capabilities: capabilityRows };
    try {
      await fetch('/api/supplier/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'save',
          stepKey: activeStep,
          values: payload,
          markComplete,
        }),
      });
      await fetch('/api/onboarding/seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'save',
          stepKey: activeStep,
          values: payload,
          markComplete,
        }),
      });
    } catch { /* ignore */ }
    setSaving(false);
  };

  const markComplete = useCallback(async (stepKey: SellerOnboardingStepKey) => {
    setOnboardingState((prev) => ({
      ...prev,
      completedSteps: Array.from(new Set([...(prev.completedSteps || []), stepKey])),
      draftSteps: (prev.draftSteps || []).filter((s) => s !== stepKey),
    }));
    const idx = SELLER_ONBOARDING_STEPS.findIndex((s) => s.key === stepKey);
    if (idx < SELLER_ONBOARDING_STEPS.length - 1) {
      setActiveStep(SELLER_ONBOARDING_STEPS[idx + 1].key);
    }
  }, []);

  const handleSaveAndContinue = async () => {
    await saveStep(true);
    await markComplete(activeStep);
  };

  const handleSubmitForReview = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/supplier/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'submit',
          draftPayload: { ...values, capabilities: capabilityRows },
        }),
      });
      const data = await response.json();
      if (response.ok) {
        router.push('/dashboard/seller?submitted=1');
        return;
      }
      alert(data.error?.message ?? 'Submission failed');
    } finally {
      setSaving(false);
    }
  };

  const sendMobileOtp = async () => {
    const phone = (values.phone as string)?.trim();
    if (!phone) return;
    setOtpSending(true);
    try {
      const response = await fetch('/api/supplier/verification/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'send', purpose: 'mobile_verification', target: phone }),
      });
      const data = await response.json();
      if (data.data?.devOtp) {
        setOtpCode(data.data.devOtp);
      }
    } finally {
      setOtpSending(false);
    }
  };

  const verifyMobileOtp = async () => {
    const response = await fetch('/api/supplier/verification/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'verify', purpose: 'mobile_verification', otp: otpCode }),
    });
    if (response.ok) {
      updateField('mobileVerified', true);
    }
  };

  const addCapability = () => {
    setCapabilityRows((prev) => [
      ...prev,
      { processName: '', materialsSupported: '', monthlyCapacity: '', machineCount: '', toleranceCapability: '', maxPartSize: '', minPartSize: '' },
    ]);
  };

  const addDocument = (documentType: string, fileUrl: string, storagePath?: string) => {
    const docs = Array.isArray(values.documents) ? [...(values.documents as object[])] : [];
    docs.push({ documentType, fileUrl, storagePath });
    updateField('documents', docs);
    if (documentType === 'gst_certificate') updateField('gstCertificate', true);
    if (documentType === 'pan_card') updateField('panCard', true);
    if (documentType === 'company_registration') updateField('companyRegistration', true);
  };

  const addFactoryPhoto = (category: string, fileUrl: string, storagePath?: string) => {
    const photos = Array.isArray(values.factoryPhotos) ? [...(values.factoryPhotos as object[])] : [];
    photos.push({ category, fileUrl, storagePath });
    updateField('factoryPhotos', photos);
  };

  const handleDocumentUpload = async (documentType: string, file: File) => {
    const key = `doc-${documentType}`;
    setUploadingKey(key);
    try {
      const result = await uploadSupplierFile({
        file,
        bucket: 'verification-docs',
        entityType: documentType,
      });
      addDocument(documentType, result.publicUrl, result.storagePath);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleFactoryPhotoUpload = async (category: string, file: File) => {
    const key = `photo-${category}`;
    setUploadingKey(key);
    try {
      const result = await uploadSupplierFile({
        file,
        bucket: 'factory-photos',
        entityType: category,
      });
      addFactoryPhoto(category, result.publicUrl, result.storagePath);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <ShieldCheck className="mb-4 h-12 w-12 text-slate-300" />
        <h1 className="mb-2 text-xl font-bold text-slate-900">Login Required</h1>
        <p className="mb-6 text-sm text-slate-500">Please login to complete supplier verification.</p>
        <Link href="/login?redirect=/onboarding/seller"><Button>Login</Button></Link>
      </div>
    );
  }

  const currentStepDef = SELLER_ONBOARDING_STEPS.find((s) => s.key === activeStep)!;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Supplier Verification</h1>
            <p className="text-xs text-slate-500">Profile completion: {completion.overallPercent}% (weighted)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all" style={{ width: `${completion.overallPercent}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-500">{progress.completedCount}/{SELLER_ONBOARDING_STEPS.length} steps</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <nav className="space-y-1">
            {SELLER_ONBOARDING_STEPS.map((step) => {
              const status = progress.steps.find((s) => s.key === step.key)?.status || 'not_started';
              const Icon = STEP_ICONS[step.key];
              const isActive = activeStep === step.key;
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setActiveStep(step.key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors',
                    isActive ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    status === 'complete' ? 'bg-emerald-100 text-emerald-600' :
                    isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400',
                  )}>
                    {status === 'complete' ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 truncate">{step.title}</div>
                </button>
              );
            })}
          </nav>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">{currentStepDef.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{currentStepDef.goal}</p>
            </div>

            {activeStep === 'company_information' && (
              <div className="space-y-4">
                <Field label="Company Name *"><Input value={(values.companyName as string) || ''} onChange={(e) => updateField('companyName', e.target.value)} /></Field>
                <Field label="Legal Business Name *"><Input value={(values.legalBusinessName as string) || ''} onChange={(e) => updateField('legalBusinessName', e.target.value)} /></Field>
                <Field label="Business Type *">
                  <select className="w-full rounded-lg border px-3 py-2 text-sm" value={(values.businessType as string) || ''} onChange={(e) => updateField('businessType', e.target.value)}>
                    <option value="">Select</option>
                    {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Company Description *"><Textarea value={(values.companyDescription as string) || ''} onChange={(e) => updateField('companyDescription', e.target.value)} rows={3} /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Year Established *"><Input type="number" value={(values.yearEstablished as string) || ''} onChange={(e) => updateField('yearEstablished', e.target.value)} /></Field>
                  <Field label="Employees *"><Input value={(values.numberOfEmployees as string) || ''} onChange={(e) => updateField('numberOfEmployees', e.target.value)} placeholder="e.g. 50-100" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="GST Number *"><Input value={(values.gstNumber as string) || ''} onChange={(e) => updateField('gstNumber', e.target.value)} /></Field>
                  <Field label="PAN Number *"><Input value={(values.panNumber as string) || ''} onChange={(e) => updateField('panNumber', e.target.value)} /></Field>
                </div>
                <Field label="Website *"><Input value={(values.website as string) || ''} onChange={(e) => updateField('website', e.target.value)} /></Field>
                <Field label="LinkedIn *"><Input value={(values.linkedinUrl as string) || ''} onChange={(e) => updateField('linkedinUrl', e.target.value)} /></Field>
              </div>
            )}

            {activeStep === 'address' && (
              <div className="space-y-4">
                <Field label="Country *">
                  <select className="w-full rounded-lg border px-3 py-2 text-sm" value={(values.countryId as string) || ''} onChange={(e) => updateField('countryId', e.target.value)}>
                    <option value="">Select country</option>
                    {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="State *">
                  <select className="w-full rounded-lg border px-3 py-2 text-sm" value={(values.stateId as string) || ''} onChange={(e) => updateField('stateId', e.target.value)}>
                    <option value="">Select state</option>
                    {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="City *">
                  <select className="w-full rounded-lg border px-3 py-2 text-sm" value={(values.cityId as string) || ''} onChange={(e) => updateField('cityId', e.target.value)}>
                    <option value="">Select city</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Full Address *"><Textarea value={(values.fullAddress as string) || ''} onChange={(e) => updateField('fullAddress', e.target.value)} rows={2} /></Field>
                <Field label="Pincode *"><Input value={(values.pincode as string) || ''} onChange={(e) => updateField('pincode', e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Latitude *"><Input value={(values.latitude as string) || ''} onChange={(e) => updateField('latitude', e.target.value)} placeholder="e.g. 19.0760" /></Field>
                  <Field label="Longitude *"><Input value={(values.longitude as string) || ''} onChange={(e) => updateField('longitude', e.target.value)} placeholder="e.g. 72.8777" /></Field>
                </div>
              </div>
            )}

            {activeStep === 'capabilities' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Add at least one manufacturing process with full details.</p>
                {capabilityRows.map((row, index) => (
                  <div key={index} className="rounded-lg border p-4 space-y-3">
                    <Field label="Process *">
                      <select className="w-full rounded-lg border px-3 py-2 text-sm" value={row.processName} onChange={(e) => {
                        const next = [...capabilityRows];
                        next[index] = { ...row, processName: e.target.value };
                        setCapabilityRows(next);
                      }}>
                        <option value="">Select process</option>
                        {MANUFACTURING_PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </Field>
                    <Field label="Materials Supported"><Input value={row.materialsSupported} onChange={(e) => { const next = [...capabilityRows]; next[index] = { ...row, materialsSupported: e.target.value }; setCapabilityRows(next); }} placeholder="Steel, Aluminum, etc." /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Monthly Capacity"><Input value={row.monthlyCapacity} onChange={(e) => { const next = [...capabilityRows]; next[index] = { ...row, monthlyCapacity: e.target.value }; setCapabilityRows(next); }} /></Field>
                      <Field label="Machine Count"><Input value={row.machineCount} onChange={(e) => { const next = [...capabilityRows]; next[index] = { ...row, machineCount: e.target.value }; setCapabilityRows(next); }} /></Field>
                    </div>
                    <Field label="Tolerance Capability"><Input value={row.toleranceCapability} onChange={(e) => { const next = [...capabilityRows]; next[index] = { ...row, toleranceCapability: e.target.value }; setCapabilityRows(next); }} placeholder="±0.01mm" /></Field>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addCapability}>+ Add Process</Button>
              </div>
            )}

            {activeStep === 'factory_information' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Factory Area (sqft) *"><Input type="number" value={(values.factoryArea as string) || ''} onChange={(e) => updateField('factoryArea', e.target.value)} /></Field>
                  <Field label="Production Area *"><Input type="number" value={(values.productionArea as string) || ''} onChange={(e) => updateField('productionArea', e.target.value)} /></Field>
                  <Field label="Warehouse Area *"><Input type="number" value={(values.warehouseArea as string) || ''} onChange={(e) => updateField('warehouseArea', e.target.value)} /></Field>
                </div>
                <Field label="Number of Machines *"><Input type="number" value={(values.numberOfMachines as string) || ''} onChange={(e) => updateField('numberOfMachines', e.target.value)} /></Field>
                <Field label="Quality Certifications *">
                  <div className="grid grid-cols-2 gap-2">
                    {QUALITY_CERTIFICATIONS.map((cert) => (
                      <label key={cert} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                        <input type="checkbox" checked={((values.qualityCertifications as string[]) || []).includes(cert)}
                          onChange={(e) => {
                            const current = (values.qualityCertifications as string[]) || [];
                            updateField('qualityCertifications', e.target.checked ? [...current, cert] : current.filter((c) => c !== cert));
                          }} />
                        {cert}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {activeStep === 'verification_documents' && (
              <div className="space-y-4">
                {[
                  { type: 'gst_certificate', label: 'GST Certificate *' },
                  { type: 'pan_card', label: 'PAN Card *' },
                  { type: 'company_registration', label: 'Company Registration *' },
                ].map((doc) => (
                  <div key={doc.type} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">{doc.label}</span>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleDocumentUpload(doc.type, file);
                          e.target.value = '';
                        }}
                      />
                      <Button variant="outline" size="sm" asChild disabled={uploadingKey === `doc-${doc.type}`}>
                        <span>
                          {uploadingKey === `doc-${doc.type}` ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                          Upload
                        </span>
                      </Button>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {activeStep === 'media_uploads' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Upload minimum 5 factory photos across categories.</p>
                {FACTORY_MEDIA_CATEGORIES.map((cat) => (
                  <div key={cat} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm capitalize">{cat.replace('_', ' ')}</span>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleFactoryPhotoUpload(cat, file);
                          e.target.value = '';
                        }}
                      />
                      <Button variant="outline" size="sm" asChild disabled={uploadingKey === `photo-${cat}`}>
                        <span>
                          {uploadingKey === `photo-${cat}` ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                          Add Photo
                        </span>
                      </Button>
                    </label>
                  </div>
                ))}
                <p className="text-sm text-slate-500">
                  Photos uploaded: {((values.factoryPhotos as unknown[]) || []).length} / 5 minimum
                </p>
              </div>
            )}

            {activeStep === 'review_submit' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="font-semibold">Profile Completion: {completion.overallPercent}%</p>
                  {completion.sections.map((s) => (
                    <div key={s.key} className="mt-2 flex justify-between text-sm">
                      <span>{s.label}</span>
                      <span className={s.percent === 100 ? 'text-emerald-600' : 'text-amber-600'}>{s.percent}%</span>
                    </div>
                  ))}
                </div>
                <Field label="Mobile Number *"><Input value={(values.phone as string) || ''} onChange={(e) => updateField('phone', e.target.value)} /></Field>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void sendMobileOtp()} disabled={otpSending}>Send OTP</Button>
                  <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter OTP" className="max-w-[140px]" />
                  <Button size="sm" onClick={() => void verifyMobileOtp()}>Verify Mobile</Button>
                </div>
                <p className="text-sm text-slate-600">
                  Email: {values.emailVerified ? '✓ Verified' : 'Pending — verify via account settings'}
                </p>
                <p className="text-sm text-slate-600">
                  Mobile: {values.mobileVerified ? '✓ Verified' : 'Not verified'}
                </p>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t pt-6">
              <div />
              <div className="flex gap-3">
                {activeStep === 'review_submit' ? (
                  <Button onClick={() => void handleSubmitForReview()} disabled={saving || completion.overallPercent < 100} className="bg-emerald-600">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit for Admin Review
                  </Button>
                ) : (
                  <Button onClick={() => void handleSaveAndContinue()} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
      {children}
    </div>
  );
}
