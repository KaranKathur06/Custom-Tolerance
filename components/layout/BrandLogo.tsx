import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/config/brand";

type BrandLogoProps = {
  href?: string;
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ href = "/", compact = false, className = "" }: BrandLogoProps) {
  const image = (
    <Image
      src={compact ? "/favicon.png" : "/logo.png"}
      alt={BRAND.name}
      width={compact ? 48 : 260}
      height={compact ? 48 : 96}
      priority
      className={compact ? "h-9 w-9 object-contain" : "h-10 w-auto max-w-[220px] object-contain"}
    />
  );

  return href ? <Link href={href} aria-label={`${BRAND.name} home`} className={className}>{image}</Link> : <span className={className}>{image}</span>;
}
