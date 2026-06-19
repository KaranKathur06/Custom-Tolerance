import type { UploadResult } from "@/lib/marketplace/seller-upload-client";

export type SellerUploadAsset = UploadResult;

export type StepProps = {
  form: Record<string, unknown>;
  errors: Record<string, string>;
  documents: Record<string, SellerUploadAsset | undefined>;
  images: Record<string, SellerUploadAsset[]>;
  video: SellerUploadAsset | null;
  onFieldChange: (field: string, value: unknown) => void;
  onDocumentChange: (documentType: string, asset: SellerUploadAsset | null) => void;
  onImagesChange: (category: string, images: SellerUploadAsset[]) => void;
  onVideoChange: (video: SellerUploadAsset | null) => void;
  onVideoUrlChange: (url: string) => void;
};

export type MachineRow = {
  machineName: string;
  brand: string;
  model: string;
  quantity: string;
  capacity: string;
  yearPurchased: string;
  photoFileId?: string;
  photoFileUrl?: string;
  photoStoragePath?: string;
  datasheetFileId?: string;
  datasheetFileUrl?: string;
  datasheetStoragePath?: string;
};

export type CertificationRow = {
  certificateName: string;
  certificateNumber: string;
  expiryDate: string;
  certificateFileId?: string;
  certificateFileUrl?: string;
  certificateStoragePath?: string;
};

export type ExportRow = {
  customerName: string;
  country: string;
  productExported: string;
  orderValue: string;
  proofFileId?: string;
  proofFileUrl?: string;
  proofStoragePath?: string;
};

export type FactoryPhotoCategory =
  | "Exterior"
  | "Shop Floor"
  | "Machines"
  | "QC Department"
  | "Warehouse"
  | "Office";
