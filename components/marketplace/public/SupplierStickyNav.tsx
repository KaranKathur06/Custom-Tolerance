"use client";

import { useEffect, useRef, useState } from "react";

type Section = {
  id: string;
  label: string;
};

type SupplierStickyNavProps = {
  sections: Section[];
  className?: string;
};

export function SupplierStickyNav({ sections, className = "" }: SupplierStickyNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(section.id);
          }
        },
        { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  return (
    <nav
      ref={navRef}
      className={`ct-sticky-nav ${className}`}
      aria-label="Profile sections"
    >
      <div className="container">
        <div className="flex gap-0 overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollTo(section.id)}
              className={`whitespace-nowrap ${activeId === section.id ? "active" : ""}`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
