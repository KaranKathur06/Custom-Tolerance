import type { IrfqDraftPayload, IrfqItemInput } from "./types";

const MACRO_EXTENSIONS = [".docm", ".xlsm", ".pptm", ".exe", ".bat", ".cmd", ".js", ".vbs"];

export function validateDraftStep(step: number, payload: IrfqDraftPayload): string | null {
  if (step === 0) {
    if (!payload.rfqTitle?.trim() && !payload.title?.trim() && !payload.projectName?.trim()) {
      return "RFQ title or project name is required";
    }
  }

  if (step === 1) {
    if (!payload.projectType?.trim()) return "Project type is required";
    if (!payload.industryId?.trim()) return "Industry is required";
  }

  if (step === 5) {
    if (!payload.deliveryState?.trim() && !payload.supplierLocationPref?.global) {
      return "Delivery state or global supplier preference is required";
    }
    if (!payload.deliveryCity?.trim() && !payload.supplierLocationPref?.global) {
      return "Delivery city is required";
    }
  }

  if (step === 6) {
    if (payload.quotationDeadline) {
      const deadline = new Date(payload.quotationDeadline);
      const minDeadline = Date.now() + 48 * 60 * 60 * 1000;
      if (deadline.getTime() < minDeadline) {
        return "Quotation deadline must be at least 48 hours from now";
      }
    }
  }

  return null;
}

export function validateItemInput(item: IrfqItemInput): string | null {
  if (!item.itemName?.trim()) return "Item name is required";
  if (!Number.isFinite(item.quantity) || item.quantity <= 0) return "Quantity must be greater than 0";
  if (!item.unit?.trim()) return "Unit is required";
  if (item.quantity > 999_999_999) return "Quantity exceeds maximum allowed";
  return null;
}

export function validatePublishRequirements(
  payload: IrfqDraftPayload,
  itemCount: number,
): string | null {
  const title = payload.rfqTitle?.trim() || payload.title?.trim() || payload.projectName?.trim();
  if (!title) return "RFQ title is required before publishing";
  if (!payload.projectType?.trim()) return "Project type is required";
  if (!payload.industryId?.trim()) return "Industry is required";
  if (itemCount < 1) return "At least one line item is required";
  if (!payload.deliveryState?.trim() && !payload.supplierLocationPref?.global) {
    return "Delivery location is required";
  }
  return null;
}

export function isBlockedUploadFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return MACRO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function inferRfqFileType(filename: string, mimeType: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "pdf",
    dxf: "dxf",
    dwg: "dwg",
    step: "step",
    stp: "step",
    iges: "iges",
    igs: "iges",
    stl: "stl",
    docx: "docx",
    xlsx: "xlsx",
    jpg: "image",
    jpeg: "image",
    png: "image",
    webp: "image",
    gif: "image",
    zip: "zip",
  };
  if (map[ext]) return map[ext];
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  return "other";
}

export const RFQ_DRAWING_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "model/step",
  "application/step",
  "application/octet-stream",
];

export const RFQ_MAX_TOTAL_BYTES = 5 * 1024 * 1024 * 1024;
export const RFQ_MAX_SINGLE_FILE_BYTES = 500 * 1024 * 1024;
