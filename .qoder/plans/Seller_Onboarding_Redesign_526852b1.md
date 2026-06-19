# Seller Onboarding UI Redesign

## Current State Assessment

The existing codebase already implements many of the requested patterns (horizontal top stepper, safe JSON parsing, friendly error masking, sticky trust panel, 3-column grids). The main work is:
1. Fix critical duplication bugs
2. Visual/UX polish to match Stripe/Alibaba quality
3. Enhanced document center and factory gallery

---

## Task 1: Fix Critical Duplication Bugs

**Files:**
- `components/onboarding/seller/ProfileCompletionStep.tsx` -- The entire component is exported twice (lines 1-121 and 122-232). Remove the duplicate, keep the cleaner first version with `bg-slate-50/50` sections.
- `components/onboarding/seller/ImageUploadGrid.tsx` -- Same issue (lines 1-181 and 182-339). Remove duplicate, keep the first version which has better styling.

---

## Task 2: Widen Form Container and Refine Layout

**File:** `components/onboarding/OnboardingV3Wizard.tsx`

Changes to `WizardShell`:
- Increase main container from `max-w-[1480px]` to `max-w-[1600px]` for more breathing room
- Add `px-6 lg:px-10` for better responsive padding
- Increase form card padding from `p-6 lg:p-8` to `p-6 lg:p-10`
- Add subtle `shadow-md` to the form card for depth

Changes to horizontal stepper:
- Add connecting lines (not just dots) between steps for Stripe-like appearance
- Add step percentage badge under each step label
- Increase step circle size from `h-7 w-7` to `h-8 w-8`
- Add active step indicator bar below the stepper (blue underline)

Changes to trust panel:
- Keep at `w-[320px]` and `sticky top-[100px]`
- Reduce visual density: add more padding, smaller text hierarchy
- Add "Verified" / "Pending" status dots (green/amber) before each label

---

## Task 3: Enhance Step Card Design

**Files:** All step components under `components/onboarding/seller/`

For each step, add a section header card at the top:
- Step title in large bold text
- Goal description below
- Subtle bottom border
- Consistent `mb-8` spacing

Wrap each logical section in a bordered card with:
- Light background `bg-slate-50/30`
- Rounded corners `rounded-xl`
- Internal padding `p-6`
- Section title with icon

---

## Task 4: Upgrade Document Center UX

**File:** `components/onboarding/seller/DocumentUploadField.tsx`

Redesign the card to be more prominent:
- Increase minimum height for upload zone
- Add dashed border animation on hover
- Show file type icon (PDF, JPG, etc.) as large colored badge
- After upload: show large green checkmark, file name prominently, file size
- Add "View", "Replace", "Delete" as labeled buttons (not just icons)
- Add upload progress indicator during upload
- Make error states more visible with retry button

**File:** `components/onboarding/seller/BankVerificationStep.tsx`

- Reorganize KYC documents into a clear "Document Center" section
- Add section description: "Upload KYC documents. All files are securely stored and encrypted."
- Ensure 3-column card grid on desktop
- Add visual separator between bank details and document sections

---

## Task 5: Enhance Factory Gallery

**File:** `components/onboarding/seller/ImageUploadGrid.tsx`

- Show category icon/header for each photo section (Exterior, Shop Floor, etc.)
- Increase thumbnail size in grid
- Add image count badge on each category card
- Show "Minimum X required" warning more prominently
- Add drag-and-drop zone styling (currently just click-to-upload)
- After upload, show image in a proper lightbox-style preview on click

**File:** `components/onboarding/seller/ProfileCompletionStep.tsx`

- Change factory gallery from 2-column to full-width with category cards in a 3-column grid
- Each category becomes a standalone card with its own upload zone

---

## Task 6: Add Machine Video Support

**File:** `components/onboarding/seller/types.ts`

Add `videoFileUrl` and `videoStoragePath` fields to `MachineRow`.

**File:** `components/onboarding/seller/MachinesEditor.tsx`

- Add YouTube URL input field per machine row
- Add optional MP4 upload per machine row  
- Restructure each machine row into a cleaner card layout with sections:
  - Basic Info (name, brand, model, year, quantity, capacity)
  - Media (photo, datasheet, video)

---

## Task 7: Enhance Certifications Editor

**File:** `components/onboarding/seller/CertificationsEditor.tsx`

- Add certificate image upload field (in addition to PDF)
- Add preview for uploaded certificate images
- Improve card layout with clear sections

**File:** `components/onboarding/seller/types.ts`

Add `certificateImageId`, `certificateImageUrl`, `certificateImageStoragePath` to `CertificationRow`.

---

## Task 8: Enhance Export Experience Editor

**File:** `components/onboarding/seller/ExportExperienceEditor.tsx`

- Add support for multiple proof documents per export entry (PO, Invoice, Shipping Bill, Export Certificate)
- Improve card layout

**File:** `components/onboarding/seller/types.ts`

The existing `proofFileId` is sufficient (single file per entry). No type changes needed here unless multi-file is desired.

---

## Task 9: Polish Registration Complete Step

**File:** `components/onboarding/seller/RegistrationCompleteStep.tsx`

- Redesign to be more celebratory (Stripe-like confirmation)
- Add large success/warning icon
- Show completion percentage prominently with circular progress
- List remaining items as actionable links that jump to the correct step
- Add "Continue to Profile" CTA button

---

## Task 10: Final Visual Polish

**File:** `components/onboarding/OnboardingV3Wizard.tsx`

- Add smooth transitions between steps
- Improve `WizardActions` bar: larger buttons, better spacing, sticky bottom on mobile
- Add "Save draft" success toast indicator
- Improve `GlobalErrorBanner` with retry/save-draft buttons for server errors

**File:** `app/onboarding/seller/page.tsx`

- Ensure all error paths return friendly messages (already done in current code)
- Add auto-save draft indicator ("Last saved: 2 minutes ago")

---

## Files Modified (Summary)

| File | Change |
|------|--------|
| `components/onboarding/OnboardingV3Wizard.tsx` | Layout width, stepper design, trust panel polish, wizard actions |
| `components/onboarding/seller/ProfileCompletionStep.tsx` | Fix duplication, enhance gallery layout |
| `components/onboarding/seller/ImageUploadGrid.tsx` | Fix duplication, improve gallery UX |
| `components/onboarding/seller/DocumentUploadField.tsx` | Enhanced card design, labeled action buttons |
| `components/onboarding/seller/BankVerificationStep.tsx` | Document center section redesign |
| `components/onboarding/seller/GstVerificationStep.tsx` | Section header card styling |
| `components/onboarding/seller/BasicInformationStep.tsx` | Section header card styling |
| `components/onboarding/seller/BusinessDetailsStep.tsx` | Section header card styling |
| `components/onboarding/seller/MachinesEditor.tsx` | Video support, improved layout |
| `components/onboarding/seller/CertificationsEditor.tsx` | Image upload, improved layout |
| `components/onboarding/seller/ExportExperienceEditor.tsx` | Improved card layout |
| `components/onboarding/seller/RegistrationCompleteStep.tsx` | Celebratory redesign |
| `components/onboarding/seller/types.ts` | Add video fields to MachineRow, image fields to CertificationRow |

No changes needed to API routes, lib logic, or Supabase configuration -- the backend is already correct.
