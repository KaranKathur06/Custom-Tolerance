"use client";

import { useEffect, useRef, useState } from "react";

type Section = {
  id: string;
  label: string;
};

type DashboardSectionNavProps = {
  sections: Section[];
  className?: string;
};

export function DashboardSectionNav({ sections, className = "" }: DashboardSectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const navRef = useRef<HTMLDivElement>(null);

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
        { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div ref={navRef} className={`ct-sticky-nav ${className}`}>
      <div className="container">
        <nav className="flex gap-0 overflow-x-auto" aria-label="Dashboard sections">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollTo(section.id)}
              className={activeId === section.id ? "active" : ""}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
