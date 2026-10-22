// Checks a backend against the eWARP API contract (docs/openapi.yaml).
//
//   npm run check:api                                   -> the reference API (needs `npm run dev`)
//   npm run check:api -- https://api.example.com/api/v1  -> your backend
//   npm run check:api -- <url> --project prj_1           -> check a specific project
//   npm run check:api -- <url> --writes                  -> also check the vendor write routes, using a
//                                                          temporary "Contract check" vendor it deletes after
//
// Set FEEDBACK_API_TOKEN to send "Authorization: Bearer <token>".
// It calls every route, validates each response body against its schema, checks that missing
// IDs return 404 with the error shape, and exits non-zero if anything fails.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const base = (args.find((a) => !a.startsWith("--") && a !== flag("--project")) ?? "http://localhost:3000/api/v1").replace(/\/$/, "");
const token = process.env.FEEDBACK_API_TOKEN;

const spec = parse(readFileSync(fileURLToPath(new URL("../docs/openapi.yaml", import.meta.url)), "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(spec, "openapi");
const validator = (name) => ajv.getSchema(`openapi#/components/schemas/${name}`);

const results = [];
const color = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);

async function call(path) {
  const res = await fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // leave body null; reported below
  }
  return { status: res.status, body };
}

function record(label, problems) {
  results.push({ label, problems });
  const mark = problems.length ? color(31, "✗") : color(32, "✓");
  console.log(`${mark} ${label}`);
  for (const p of problems) console.log(`    ${color(2, p)}`);
}

// GET a route, expect 200 and a body matching `schema`. Returns the body (or null on failure).
async function check(path, schema, extra = () => []) {
  const label = `GET ${path}`;
  try {
    const { status, body } = await call(path);
    if (status !== 200) return record(label, [`expected 200, got ${status}${body?.error?.message ? `: ${body.error.message}` : ""}`]), null;
    if (body === null) return record(label, ["response is not JSON"]), null;
    const validate = validator(schema);
    const problems = validate(body) ? [] : validate.errors.slice(0, 8).map((e) => `${schema}${e.instancePath || ""} ${e.message}`);
    problems.push(...extra(body));
    record(label, problems);
    return problems.length ? null : body;
  } catch (err) {
    record(label, [`request failed: ${err.message}`]);
    return null;
  }
}

async function expect404(path) {
  const label = `GET ${path} → 404`;
  try {
    const { status, body } = await call(path);
    const problems = [];
    if (status !== 404) problems.push(`expected 404, got ${status}`);
    const validate = validator("Error");
    if (!validate(body)) problems.push('body must be { "error": { "code", "message" } }');
    record(label, problems);
  } catch (err) {
    record(label, [`request failed: ${err.message}`]);
  }
}

const atMost = (n) => (body) => (body.items.length > n ? [`returned ${body.items.length} items with limit=${n}`] : []);

console.log(`Checking ${base}\n`);

await check("/me", "CurrentUser");
const projects = await check("/projects", "ProjectList");
const project =
  projects?.items.find((p) => p.id === flag("--project")) ??
  [...(projects?.items ?? [])].sort((a, b) => b.responseCount - a.responseCount)[0];

if (!project) {
  console.log(color(33, "\nNo project to check further. Create one with some responses, or pass --project <id>."));
} else {
  const p = `/projects/${encodeURIComponent(project.id)}`;
  console.log(`\nProject: ${project.name} (${project.id})\n`);

  await check(p, "Project");
  await check(`${p}/summary`, "ProjectSummary");
  await check(`${p}/analytics/responses-by-week?weeks=6`, "ResponsesByWeek", (b) =>
    b.weeks.length === 6 ? [] : [`expected 6 weeks for weeks=6, got ${b.weeks.length}`],
  );
  await check(`${p}/analytics/coverage`, "CoverageBreakdown", (b) =>
    b.all + b.some + b.none === b.total ? [] : ["all + some + none must equal total"],
  );
  const features = await check(`${p}/features`, "FeatureList");
  await check(`${p}/features?sort=mentions&limit=5`, "FeatureList", atMost(5));
  await check(`${p}/features?view=gap&q=a&sort=name`, "FeatureList", (b) =>
    b.items.every((f) => f.coverage === "none") ? [] : ["view=gap returned features that some vendor offers"],
  );
  const vendors = await check(`${p}/vendors?sort=fit`, "VendorList");
  await check(`${p}/vendors?sort=name`, "VendorList");
  const responses = await check(`${p}/responses?limit=10&offset=0`, "ResponseList", atMost(10));
  await check(`${p}/responses?status=pending&sort=oldest&q=a`, "ResponseList", (b) =>
    b.items.every((r) => !r.analyzed) ? [] : ["status=pending returned analyzed responses"],
  );
  await check(`${p}/surveys`, "SurveyList");
  await check(`${p}/graph`, "ProjectGraph");
  await check(`${p}/activity?limit=3`, "ActivityList", atMost(3));

  const featureId = features?.items.find((f) => f.mentions > 0)?.id ?? features?.items[0]?.id;
  if (featureId) {
    const f = `${p}/features/${encodeURIComponent(featureId)}`;
    console.log(`\nFeature: ${featureId}\n`);
    await check(f, "Feature");
    await check(`${f}/summary`, "AiSummary");
    await check(`${f}/responses`, "FeatureResponseList");
    await check(`${f}/responses?kind=like`, "FeatureResponseList", (b) =>
      b.items.every((r) => r.kinds.includes("like")) ? [] : ["kind=like returned responses without a like"],
    );
    await check(`${f}/vendors`, "FeatureVendorList");
    await check(`${f}/related?limit=8`, "RelatedFeatureList", atMost(8));
  } else {
    console.log(color(33, "\nNo features in this project; skipped the feature routes."));
  }

  const vendorId = vendors?.items[0]?.id;
  if (vendorId) {
    const v = `${p}/vendors/${encodeURIComponent(vendorId)}`;
    console.log(`\nVendor: ${vendorId}\n`);
    await check(v, "Vendor");
    await check(`${v}/summary`, "AiSummary");
    await check(`${v}/requests`, "VendorRequestList");
    await check(`${v}/features`, "VendorFeatureList");
    await check(`${v}/responses`, "ResponseWithMentionsList");
  } else {
    console.log(color(33, "\nNo vendors in this project; skipped the vendor routes."));
  }

  const responseId = responses?.items[0]?.id;
  if (responseId) {
    console.log(`\nResponse: ${responseId}\n`);
    await check(`${p}/responses/${encodeURIComponent(responseId)}`, "ResponseDetail");
  } else {
    console.log(color(33, "\nNo responses in this project; skipped the response route."));
  }

  console.log("\nMissing IDs\n");
  await expect404("/projects/__missing__");
  await expect404(`${p}/features/__missing__`);
  await expect404(`${p}/vendors/__missing__`);
  await expect404(`${p}/responses/__missing__`);

  if (args.includes("--writes")) {
    await checkWrites(p, featureId);
  } else {
    console.log(color(2, "\nVendor write routes not checked. Add --writes to create, edit and delete a temporary test vendor."));
  }
}

// Opt-in: creates a vendor named "Contract check <time>", edits it, then deletes it. Existing vendors are never touched.
async function checkWrites(p, featureId) {
  console.log("\nVendor writes (temporary test vendor)\n");

  async function expect(method, path, body, status, schema, extra = () => []) {
    const label = `${method} ${path}${body === undefined ? "" : ` ${JSON.stringify(body)}`} → ${status}`;
    try {
      const res = await send(method, path, body);
      const problems = res.status === status ? [] : [`expected ${status}, got ${res.status}${res.body?.error?.message ? `: ${res.body.error.message}` : ""}`];
      if (!problems.length && schema) {
        const validate = validator(schema);
        if (!validate(res.body)) problems.push(...validate.errors.slice(0, 8).map((e) => `${schema}${e.instancePath || ""} ${e.message}`));
        else problems.push(...extra(res.body));
      }
      record(label, problems);
      return problems.length ? null : res.body ?? true;
    } catch (err) {
      record(label, [`request failed: ${err.message}`]);
      return null;
    }
  }

  // Rejected before anything is created, so this never leaves a project behind.
  await expect("POST", "/projects", { name: "Contract check", vendors: [] }, 400, "Error");

  const name = `Contract check ${new Date().toISOString().slice(0, 19)}`;
  const created = await expect("POST", `${p}/vendors`, { name }, 201, "Vendor", (v) =>
    v.name === name && v.form === name && v.featureIds.length === 0 && v.responseCount === 0
      ? []
      : ["new vendor should have the sent name, form defaulting to the name, no features and no responses"],
  );
  if (!created) {
    console.log(color(33, "\nCouldn't create the test vendor; skipped the rest of the write checks."));
    return;
  }
  const v = `${p}/vendors/${encodeURIComponent(created.id)}`;

  await expect("POST", `${p}/vendors`, { name: name.toUpperCase() }, 409, "Error");
  await expect("POST", `${p}/vendors`, { name: `${name} B`, form: name.toLowerCase() }, 409, "Error");
  await expect("PATCH", v, { form: `${name} form` }, 200, "Vendor", (b) => (b.form === `${name} form` ? [] : ["form was not updated"]));
  await expect("POST", `${p}/vendors`, { name: "   " }, 400, "Error");
  await expect("PATCH", v, { name: `${name} (renamed)` }, 200, "Vendor", (b) =>
    b.name === `${name} (renamed)` ? [] : ["name was not updated"],
  );
  if (featureId) {
    await expect("PATCH", v, { featureIds: [featureId] }, 200, "Vendor", (b) =>
      b.featureIds.length === 1 && b.featureIds[0] === featureId ? [] : ["featureIds should be exactly the list sent"],
    );
    await check(`${p}/features/${encodeURIComponent(featureId)}`, "Feature", (f) =>
      f.vendorIds.includes(created.id) ? [] : ["the feature's vendorIds should now include the test vendor"],
    );
    await expect("PATCH", v, { featureIds: [] }, 200, "Vendor", (b) => (b.featureIds.length === 0 ? [] : ["featureIds: [] should clear the list"]));
  }
  await expect("PATCH", v, { featureIds: ["__missing__"] }, 400, "Error");
  await expect("PATCH", v, {}, 400, "Error");
  await expect("DELETE", v, undefined, 204);
  await expect404(v);
}

async function send(method, path, body) {
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) };
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let parsed = null;
  if (res.status !== 204) {
    try {
      parsed = await res.json();
    } catch {
      // leave null
    }
  }
  return { status: res.status, body: parsed };
}

const failed = results.filter((r) => r.problems.length);
console.log(
  `\n${failed.length ? color(31, `${failed.length} of ${results.length} checks failed`) : color(32, `All ${results.length} checks passed`)}`,
);
process.exit(failed.length ? 1 : 0);
