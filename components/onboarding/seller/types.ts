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
  videoFileId?: string;
  videoFileUrl?: string;
  videoStoragePath?: string;
  videoUrl?: string;
};

export type CertificationRow = {
  certificateName: string;
  certificateNumber: string;
  expiryDate: string;
  certificateFileId?: string;
  certificateFileUrl?: string;
  certificateStoragePath?: string;
  certificateImageFileId?: string;
  certificateImageFileUrl?: string;
  certificateImageStoragePath?: string;
};

export type ExportRow = {
  customerIndustry: string;
  country: string;
  productsExported: string;
  yearStarted: string;
  annualExportValue: string;
  // legacy aliases kept for backward compat
  customerName?: string;
  productExported?: string;
  orderValue?: string;
  poFileId?: string;
  poFileUrl?: string;
  poStoragePath?: string;
  invoiceFileId?: string;
  invoiceFileUrl?: string;
  invoiceStoragePath?: string;
  shippingBillFileId?: string;
  shippingBillFileUrl?: string;
  shippingBillStoragePath?: string;
  exportCertificateFileId?: string;
  exportCertificateFileUrl?: string;
  exportCertificateStoragePath?: string;
};

export type ProductRow = {
  productName: string;
  capability: string;
  materials: string[];
  toleranceCapability: string;
  monthlyCapacity: string;
  moq: string;
  leadTime: string;
  customTolerance?: string;
};

export type FactoryPhotoCategory =
  | "Exterior"
  | "Shop Floor"
  | "Machines"
  | "QC Department"
  | "Warehouse"
  | "Office";
