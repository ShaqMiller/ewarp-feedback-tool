// Checks a backend against the eWARP API contract (docs/openapi.yaml).
//
//   npm run check:api                                   -> the reference API (needs `npm run dev`)
//   npm run check:api -- https://api.example.com/api/v1  -> your backend
//   npm run check:api -- <url> --project prj_1           -> check a specific project
//   npm run check:api -- <url> --writes                  -> also check the write routes, using a temporary
//                                                          vendor, feature and user it deletes after
//
// It signs in first with POST /auth/login, as the admin in EWARP_EMAIL / EWARP_PASSWORD. Against the local
// reference API it uses the demo admin when those aren't set. Set EWARP_VIEWER_EMAIL / EWARP_VIEWER_PASSWORD
// too, to check that a viewer gets 403 on writes.
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
const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(`${base}/`);
const admin = {
  email: process.env.EWARP_EMAIL ?? (local ? "admin@demo.test" : undefined),
  password: process.env.EWARP_PASSWORD ?? (local ? (process.env.DEMO_PASSWORD ?? "ewarp-demo") : undefined),
};
const viewer = { email: process.env.EWARP_VIEWER_EMAIL, password: process.env.EWARP_VIEWER_PASSWORD };
let token; // the admin's, set after signing in

const spec = parse(readFileSync(fileURLToPath(new URL("../docs/openapi.yaml", import.meta.url)), "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(spec, "openapi");
const validator = (name) => ajv.getSchema(`openapi#/components/schemas/${name}`);

const results = [];
const color = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);

async function call(path, as = token) {
  const res = await fetch(`${base}${path}`, { headers: as ? { Authorization: `Bearer ${as}` } : {} });
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

if (!admin.email || !admin.password) {
  console.log(color(31, "Set EWARP_EMAIL and EWARP_PASSWORD to an admin account so the check can sign in."));
  process.exit(1);
}

// Sign in as the admin; every later call sends the token.
async function login(who, label) {
  const res = await send("POST", "/auth/login", { email: who.email, password: who.password }, null);
  const validate = validator("Session");
  const problems = res.status !== 200 ? [`expected 200, got ${res.status}${res.body?.error?.message ? `: ${res.body.error.message}` : ""}`] : validate(res.body) ? [] : validate.errors.slice(0, 8).map((e) => `Session${e.instancePath || ""} ${e.message}`);
  record(`POST /auth/login (${label})`, problems);
  return problems.length ? null : res.body;
}
const session = await login(admin, admin.email);
if (!session) {
  console.log(color(31, "\nCouldn't sign in, so nothing else can be checked."));
  process.exit(1);
}
token = session.token;
if (session.user.role !== "admin") record("signed-in user is an admin", [`${admin.email} has role ${session.user.role}; use an admin account`]);

async function expectStatus(label, request, status) {
  try {
    const res = await request();
    const problems = res.status === status ? [] : [`expected ${status}, got ${res.status}`];
    if (!validator("Error")(res.body)) problems.push('body must be { "error": { "code", "message" } }');
    record(label, problems);
  } catch (err) {
    record(label, [`request failed: ${err.message}`]);
  }
}
await expectStatus("POST /auth/login with a wrong password → 401", () => send("POST", "/auth/login", { email: admin.email, password: "wrong password" }, null), 401);
await expectStatus("GET /projects without a token → 401", () => call("/projects", null), 401);

await check("/me", "CurrentUser", (me) => (me.id === session.user.id ? [] : ["/me should be the user who signed in"]));
await check("/users", "UserList");
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
  await check(`${p}/vendors`, "VendorList", (b) =>
    b.items.every((v, i) => i === 0 || b.items[i - 1].score >= v.score) ? [] : ["the default sort should be score, highest first"],
  );
  const weights = await check(`${p}/weights`, "Weights");
  await check(`${p}/scores`, "VendorScoreList", (b) => {
    const problems = [];
    if (Math.abs(b.mix.coverage + b.mix.satisfaction - 1) > 1e-9) problems.push("mix.coverage + mix.satisfaction must be 1");
    for (const v of b.items) {
      const expected = Math.round(100 * (b.mix.coverage * v.coverage + (b.mix.satisfaction * (v.satisfaction + 1)) / 2));
      if (Math.abs(expected - v.score) > 1) problems.push(`${v.vendor.name}: score ${v.score} doesn't match coverage and satisfaction (${expected})`);
    }
    return problems;
  });
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
    await check(`${f}/feedback`, "FeedbackEntryList");
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

  if (viewer.email && viewer.password) {
    console.log("\nViewer (read only)\n");
    const viewerSession = await login(viewer, viewer.email);
    if (viewerSession) {
      const as = viewerSession.token;
      const read = await call(p, as);
      record(`GET ${p} as viewer → 200`, read.status === 200 ? [] : [`expected 200, got ${read.status}`]);
      await expectStatus("GET /users as viewer → 403", () => call("/users", as), 403);
      await expectStatus(`POST ${p}/vendors as viewer → 403`, () => send("POST", `${p}/vendors`, { name: "Viewer test" }, as), 403);
      await expectStatus(`POST ${p}/features as viewer → 403`, () => send("POST", `${p}/features`, { name: "Viewer test" }, as), 403);
      await expectStatus(`PUT ${p}/weights as viewer → 403`, () => send("PUT", `${p}/weights`, { groups: [{ key: "pm", weight: 1 }] }, as), 403);
      await expectStatus(`POST ${p}/responses/reread as viewer → 403`, () => send("POST", `${p}/responses/reread`, {}, as), 403);
    }
  } else {
    console.log(color(2, "\nViewer checks skipped. Set EWARP_VIEWER_EMAIL and EWARP_VIEWER_PASSWORD to check that viewers get 403."));
  }

  if (args.includes("--writes")) {
    await checkWrites(p, featureId, vendors?.items[0]?.id, weights);
  } else {
    console.log(color(2, "\nWrite routes not checked. Add --writes to create, edit and delete a temporary vendor, feature and user."));
  }
}

// Opt-in: creates a vendor, a manual feature and a user named "Contract check <time>", edits them, then deletes them.
// Existing data is only touched to write a weight back with the value it already has.
async function checkWrites(p, featureId, vendorId, weights) {
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

  const name = `Contract check ${new Date().toISOString().slice(0, 19)}`;
  const created = await expect("POST", `${p}/vendors`, { name }, 201, "Vendor", (v) =>
    v.name === name && v.featureIds.length === 0 && v.responseCount === 0 ? [] : ["new vendor should have the sent name, no features and no responses"],
  );
  if (!created) {
    console.log(color(33, "\nCouldn't create the test vendor; skipped the rest of the write checks."));
    return;
  }
  const v = `${p}/vendors/${encodeURIComponent(created.id)}`;

  await expect("POST", `${p}/vendors`, { name: name.toUpperCase() }, 409, "Error");
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

  console.log("\nFeature writes (temporary manual feature)\n");
  const featureName = `Contract check ${new Date().toISOString().slice(0, 19)}`;
  const feature = await expect(
    "POST",
    `${p}/features`,
    {
      name: featureName,
      vendorIds: vendorId ? [vendorId] : [],
      feedback: [{ kind: "want", group: "sponsor", vendorId: null, note: "Contract check" }],
    },
    201,
    "Feature",
    (f) => {
      const problems = [];
      if (f.source !== "manual") problems.push('source should be "manual"');
      if (f.sentiment.want !== 1) problems.push("the want sent in feedback should be counted");
      if (vendorId && !f.vendorIds.includes(vendorId)) problems.push("vendorIds should include the vendor sent");
      return problems;
    },
  );
  if (feature) {
    const f = `${p}/features/${encodeURIComponent(feature.id)}`;
    await expect("POST", `${p}/features`, { name: featureName.toLowerCase() }, 409, "Error");
    await expect("POST", `${p}/features`, { name: "x", feedback: [{ kind: "meh", group: "pm" }] }, 400, "Error");
    await expect("PATCH", f, { name: `${featureName} (renamed)`, vendorIds: [] }, 200, "Feature", (b) =>
      b.name === `${featureName} (renamed)` && b.vendorIds.length === 0 ? [] : ["name and vendorIds should be exactly what was sent"],
    );
    const entry = await expect("POST", `${f}/feedback`, { kind: "dislike", group: "pd", vendorId: vendorId ?? null, note: "Contract check" }, 201, "FeedbackEntry");
    await check(`${f}/feedback`, "FeedbackEntryList", (b) => (b.total === 2 ? [] : [`expected 2 entries, got ${b.total}`]));
    if (entry) await expect("DELETE", `${f}/feedback/${encodeURIComponent(entry.id)}`, undefined, 204);
    await expect("DELETE", f, undefined, 204);
    await expect404(f);
  }

  if (weights?.groups.length) {
    console.log("\nWeights (writes back the current value)\n");
    const g = weights.groups[0];
    await expect("PUT", `${p}/weights`, { groups: [{ key: g.key, weight: g.weight }] }, 200, "Weights");
    await expect("PUT", `${p}/weights`, { groups: [{ key: g.key, weight: 11 }] }, 400, "Error");
    await expect("PUT", `${p}/weights`, { features: [{ id: "__missing__", weight: 1 }] }, 400, "Error");
  }

  // Only bad requests: a real one would make the backend's AI read responses again.
  console.log("\nReread with AI (bad requests only)\n");
  await expect("POST", `${p}/responses/reread`, { responseIds: [] }, 400, "Error");
  await expect("POST", `${p}/responses/reread`, { responseIds: ["__missing__"] }, 404, "Error");

  console.log("\nUser writes (temporary user)\n");
  const email = `contract-check-${Date.now()}@example.com`;
  const user = await expect("POST", "/users", { email, name: "Contract check", password: "contract-check-1", role: "viewer" }, 201, "User");
  if (user) {
    const u = `/users/${encodeURIComponent(user.id)}`;
    await expect("POST", "/users", { email, name: "Again", password: "contract-check-1", role: "viewer" }, 409, "Error");
    await expect("PATCH", u, { role: "admin" }, 200, "User", (b) => (b.role === "admin" ? [] : ["role was not updated"]));
    await expect("PATCH", u, { password: "short" }, 400, "Error");
    await expect("DELETE", u, undefined, 204);
  }
  await expect("DELETE", `/users/${encodeURIComponent(session.user.id)}`, undefined, 409, "Error");
}

async function send(method, path, body, as = token) {
  const headers = { ...(as ? { Authorization: `Bearer ${as}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) };
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
