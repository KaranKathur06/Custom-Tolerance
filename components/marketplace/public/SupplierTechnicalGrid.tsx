import {
  Package,
  Clock,
  Globe2,
  CreditCard,
  Layers,
  Gauge,
  Wrench,
  CheckCircle2,
} from "lucide-react";

type TechnicalDetail = {
  label: string;
  value: string;
  icon: React.ReactNode;
};

type SupplierTechnicalGridProps = {
  moq?: string | null;
  leadTime?: string | null;
  exportCapability?: boolean;
  paymentTerms?: string | null;
  materialGrades?: string | null;
  productionCapacity?: string | null;
  machinesCount?: string | null;
  qcProcess?: string | null;
  priceRange?: string | null;
};

export function SupplierTechnicalGrid({
  moq,
  leadTime,
  exportCapability,
  paymentTerms,
  materialGrades,
  productionCapacity,
  machinesCount,
  qcProcess,
  priceRange,
}: SupplierTechnicalGridProps) {
  const details: TechnicalDetail[] = [
    {
      label: "Minimum Order Qty",
      value: moq || "On request",
      icon: <Package className="h-4 w-4" />,
    },
    {
      label: "Lead Time",
      value: leadTime || "On request",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Export Capability",
      value: exportCapability ? "International Export" : "Domestic Only",
      icon: <Globe2 className="h-4 w-4" />,
    },
    {
      label: "Payment Terms",
      value: paymentTerms || "On request",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      label: "Material Grades",
      value: materialGrades || "On request",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      label: "Production Capacity",
      value: productionCapacity || "On request",
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      label: "Machines",
      value: machinesCount || "On request",
      icon: <Wrench className="h-4 w-4" />,
    },
    {
      label: "QC Process",
      value: qcProcess || "On request",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      label: "Price Range",
      value: priceRange || "On request",
      icon: <CreditCard className="h-4 w-4" />,
    },
  ].filter((d) => d.value !== "On request" || true); // show all

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {details.map((detail) => (
        <div key={detail.label} className="ct-stat-block">
          <div className="flex items-center gap-2">
            <span className="text-ct-gold">{detail.icon}</span>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {detail.label}
            </p>
          </div>
          <p className="mt-2 text-sm font-semibold text-ct-navy">
            {detail.value}
          </p>
        </div>
      ))}
    </div>
  );
}
