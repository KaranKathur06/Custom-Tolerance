import { pool, upsertRows } from "./client";

const projectTypes = [
  ["Prototype", "prototype", 10],
  ["Trial Order", "trial_order", 20],
  ["Small Batch", "small_batch", 30],
  ["Production Batch", "production_batch", 40],
  ["Annual Contract", "annual_contract", 50],
  ["OEM Manufacturing", "oem_manufacturing", 60],
  ["ODM Manufacturing", "odm_manufacturing", 70],
  ["Tooling Development", "tooling_development", 80],
  ["R&D Project", "rd_project", 90],
  ["Spare Parts Procurement", "spare_parts", 100],
];

export async function seedIrfqReferenceData() {
  await pool.query(`
    create table if not exists public.ref_project_types (
      slug text primary key,
      name text not null,
      sort_order integer not null default 100
    );
  `);

  await upsertRows(
    "ref_project_types",
    projectTypes.map(([name, slug, sort_order]) => ({ slug, name, sort_order })),
    "slug",
  );

  return { projectTypes: projectTypes.length };
}
