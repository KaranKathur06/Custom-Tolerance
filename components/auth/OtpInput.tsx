"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  idPrefix?: string;
};

export function OtpInput({
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
  idPrefix = "otp",
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(OTP_LENGTH, " ").split("").slice(0, OTP_LENGTH);

  const focusInput = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
    inputRefs.current[clamped]?.select();
  }, []);

  useEffect(() => {
    if (autoFocus) {
      focusInput(0);
    }
  }, [autoFocus, focusInput]);

  const updateValue = useCallback(
    (nextDigits: string[]) => {
      onChange(nextDigits.join("").replace(/\s/g, "").slice(0, OTP_LENGTH));
    },
    [onChange],
  );

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit || " ";
    updateValue(next);
    if (digit && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (digits[index]?.trim()) {
        next[index] = " ";
        updateValue(next);
      } else if (index > 0) {
        next[index - 1] = " ";
        updateValue(next);
        focusInput(index - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = pasted.padEnd(OTP_LENGTH, " ").split("");
    updateValue(next);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3"
      role="group"
      aria-label="6-digit verification code"
    >
      {Array.from({ length: OTP_LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          id={`${idPrefix}-${index}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digits[index]?.trim() ? digits[index].trim() : ""}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-14 w-14 sm:h-[56px] sm:w-[56px] rounded-xl border-2 bg-white text-center text-2xl font-bold text-slate-900",
            "transition-all duration-150 outline-none",
            "focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15",
            error
              ? "border-red-300 bg-red-50/30"
              : "border-slate-200 hover:border-slate-300",
            disabled && "cursor-not-allowed opacity-60",
          )}
        />
      ))}
    </div>
  );
}

export const OTP_LENGTH_EXPORT = OTP_LENGTH;
