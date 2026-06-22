/**
 * Country-aware bank field configuration.
 * Determines which bank fields to show based on seller's country of origin.
 */

export type BankFieldDef = {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  uppercase?: boolean;
};

export type BankKycDocDef = {
  key: string;
  label: string;
  required: boolean;
  accept: string;
};

export type BankFieldConfig = {
  region: string;
  fields: BankFieldDef[];
  kycDocs: BankKycDocDef[];
};

const COMMON_BANK_FIELDS: BankFieldDef[] = [
  { key: "bankName", label: "Bank Name", placeholder: "Bank name", required: true },
  { key: "accountHolderName", label: "Account Holder Name", placeholder: "Account holder name", required: true },
  { key: "accountNumber", label: "Account Number", placeholder: "Account number", required: true },
  { key: "confirmAccountNumber", label: "Confirm Account Number", placeholder: "Re-enter account number", required: true },
];

const INDIA_CONFIG: BankFieldConfig = {
  region: "India",
  fields: [
    ...COMMON_BANK_FIELDS,
    { key: "ifscCode", label: "IFSC Code", placeholder: "e.g., SBIN0001234", required: true, uppercase: true },
    { key: "branchName", label: "Branch Name", placeholder: "Branch name", required: true },
  ],
  kycDocs: [
    { key: "cancelledCheque", label: "Cancelled Cheque", required: true, accept: ".pdf,.jpg,.jpeg,.png" },
    { key: "gstCertificate", label: "GST Certificate", required: true, accept: ".pdf" },
    { key: "panCard", label: "PAN Card", required: true, accept: ".pdf,.jpg,.jpeg,.png" },
    { key: "factoryLicense", label: "Factory License", required: true, accept: ".pdf" },
  ],
};

const USA_CONFIG: BankFieldConfig = {
  region: "USA",
  fields: [
    ...COMMON_BANK_FIELDS,
    { key: "routingNumber", label: "Routing Number (ABA)", placeholder: "9-digit routing number", required: true },
    { key: "swiftCode", label: "SWIFT / BIC Code", placeholder: "e.g., BOFAUS3N", required: false, uppercase: true },
  ],
  kycDocs: [
    { key: "bankStatement", label: "Bank Statement (last 3 months)", required: true, accept: ".pdf" },
    { key: "factoryLicense", label: "Business License", required: true, accept: ".pdf" },
  ],
};

const UK_CONFIG: BankFieldConfig = {
  region: "UK",
  fields: [
    ...COMMON_BANK_FIELDS,
    { key: "sortCode", label: "Sort Code", placeholder: "e.g., 12-34-56", required: true },
    { key: "iban", label: "IBAN", placeholder: "e.g., GB29 NWBK 6016 1331 9268 19", required: true, uppercase: true },
    { key: "swiftCode", label: "SWIFT / BIC Code", placeholder: "e.g., NWBKGB2L", required: false, uppercase: true },
  ],
  kycDocs: [
    { key: "bankStatement", label: "Bank Statement (last 3 months)", required: true, accept: ".pdf" },
    { key: "factoryLicense", label: "Business Registration Certificate", required: true, accept: ".pdf" },
  ],
};

const EU_CONFIG: BankFieldConfig = {
  region: "EU",
  fields: [
    { key: "bankName", label: "Bank Name", placeholder: "Bank name", required: true },
    { key: "accountHolderName", label: "Account Holder Name", placeholder: "Account holder name", required: true },
    { key: "iban", label: "IBAN", placeholder: "e.g., DE89 3704 0044 0532 0130 00", required: true, uppercase: true },
    { key: "bicCode", label: "BIC / SWIFT Code", placeholder: "e.g., COBADEFFXXX", required: true, uppercase: true },
  ],
  kycDocs: [
    { key: "bankStatement", label: "Bank Statement (last 3 months)", required: true, accept: ".pdf" },
    { key: "factoryLicense", label: "Business Registration Certificate", required: true, accept: ".pdf" },
  ],
};

const UAE_CONFIG: BankFieldConfig = {
  region: "UAE",
  fields: [
    { key: "bankName", label: "Bank Name", placeholder: "Bank name", required: true },
    { key: "accountHolderName", label: "Account Holder Name", placeholder: "Account holder name", required: true },
    { key: "iban", label: "IBAN", placeholder: "e.g., AE07 0331 2345 6789 0123 456", required: true, uppercase: true },
    { key: "swiftCode", label: "SWIFT Code", placeholder: "e.g., NBADAEAA", required: true, uppercase: true },
  ],
  kycDocs: [
    { key: "bankStatement", label: "Bank Statement (last 3 months)", required: true, accept: ".pdf" },
    { key: "factoryLicense", label: "Trade License", required: true, accept: ".pdf" },
  ],
};

const GLOBAL_CONFIG: BankFieldConfig = {
  region: "Global",
  fields: [
    ...COMMON_BANK_FIELDS,
    { key: "swiftCode", label: "SWIFT / BIC Code", placeholder: "e.g., ABCDEFGH", required: false, uppercase: true },
  ],
  kycDocs: [
    { key: "bankStatement", label: "Bank Statement (last 3 months)", required: true, accept: ".pdf" },
    { key: "factoryLicense", label: "Business License / Registration", required: true, accept: ".pdf" },
  ],
};

/** EU country ISO codes */
const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

/** Map country name to bank config */
export function getBankFieldConfig(countryName: string): BankFieldConfig {
  if (!countryName) return GLOBAL_CONFIG;
  const lower = countryName.toLowerCase().trim();

  if (lower === "india") return INDIA_CONFIG;
  if (lower === "united states" || lower === "usa") return USA_CONFIG;
  if (lower === "united kingdom" || lower === "uk") return UK_CONFIG;
  if (lower === "united arab emirates" || lower === "uae") return UAE_CONFIG;

  // Check EU countries by name
  const euNames = [
    "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
    "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
    "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands",
    "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
  ];
  if (euNames.some((e) => lower === e.toLowerCase())) return EU_CONFIG;

  return GLOBAL_CONFIG;
}
