# Human-Readable Product Presentation System

**Status:** Design approved; awaiting written-spec review  
**Date:** 2026-10-03

## Context

CustomTolerance already has a central product formatter in `lib/product/display.ts` and formatter tests in `tests/product-display.test.ts`. However, some product surfaces still expose identifiers or apply local transformations. Examples include a public detail page that replaces underscores in pricing labels, an admin listings row that can expose a raw capability ID, and read-only seller displays that use a mixture of shared and local formatting.

The goal is to make controlled product vocabulary consistent for buyers, sellers, and operations users without changing stored values, filters, seller input, or external contracts.

## Design

Extend `lib/product/display.ts` as the single canonical presentation layer. Keep raw enum identifiers and structured product data intact through storage and DTO mapping; call field-specific presentation functions at the view boundary. Existing marketplace and seller formatter modules may remain as compatibility facades, but they must delegate to the canonical module and contain no competing mapping rules.

Formatting precedence:

1. Exact domain/semantic mapping.
2. Acronym-preserving mapping.
3. Generic humanization of unknown machine identifiers.
4. A safe fallback for absent values.

Add or complete field-specific formatters for capabilities, industries, materials, grades, lead times, packaging, shipping types, Incoterms, payment terms, price types, price units, booleans, precision/specifications, and field labels. Use current seller option IDs as the source of truth for supported mappings. Lead-time formatting should cover current options and range patterns such as `1_week`, `2_weeks`, `1_2_weeks`, and `2_4_weeks`, using an en dash for ranges. Incoterms preserve their standard abbreviations. Payment-term mappings use the agreed procurement wording, including `50% Advance, 50% Balance` and `30% Advance, 70% Balance`. Boolean text is applied only to boolean fields and may use contextual availability wording.

`precision_0_01` is a verified tolerance option: `lib/constants/product-options.ts` defines it as “Precision (±0.01 mm)”. Its display label may therefore preserve that engineering meaning. Technical identifiers such as grades, standards, material grades, units, and seller-authored descriptions must not be generically title-cased or semantically rewritten. Materials and grades remain intact except for safe presentation of controlled values where explicitly defined.

Unknown enum values must remain renderable and human-readable. For example, an unmapped `robotic_welding` becomes “Robotic Welding”, and acronym segments such as CNC, ISO, ASTM, DIN, IATF, GST, MSME, and URL retain their canonical capitalization.

## UI integration

Audit product-value rendering and migrate existing read-only product surfaces that expose controlled product data, including:

- Public product detail and marketplace/search product cards.
- Seller product preview and dashboard product lists.
- Admin listing queue/table and listing review detail.
- Other existing saved-product or inquiry/RFQ product summaries when they display the same controlled fields.

Common product terminology must match across contexts, while public, seller, and admin layouts retain their distinct existing visual identity. Seller form controls, submitted values, and option labels are out of scope for behavior or wording changes.

Convert machine-oriented field keys to natural title-case labels through the shared field-label formatter where labels are data-driven. Keep technical values readable and naturally wrapped. Preserve original seller selection order. Render large collections as wrapping tags/chips where appropriate, show each selected payment term as a distinct readable item, and keep admin tables compact with an accessible expansion mechanism if a row contains a long collection. Do not reorder or mutate values to achieve presentation.

## Compatibility and boundaries

- No database/schema changes or data migrations.
- No changes to stored enum IDs, seller form state, search/filter keys, or sorting semantics.
- No external API contract changes.
- No modification of seller-authored free text or technical identifiers for marketing-style copy.
- Preserve existing component structure, colors, page hierarchy, and per-view loading/error behavior except for focused value/label/layout presentation improvements.

## Validation

Extend the formatter test suite to cover:

- Generic and unknown enum humanization, including acronym segments.
- Canonical capability, industry, commercial, packaging, shipping, Incoterm, payment, and lead-time values present in the current options.
- Semantic boolean labels and safe missing-value fallbacks.
- Verified tolerance mapping and preservation of technical grades/material strings such as `SS304`, `AISI 4140`, and `ASTM A36`.
- Array formatting that preserves input order and yields individually readable values.

Audit each existing consumer in scope to confirm it uses the canonical formatter rather than raw enum output or local string manipulation. Run focused tests and TypeScript/lint validation, then a production build. Confirm that filtering and search continue to use canonical IDs and that seller input remains unchanged.
