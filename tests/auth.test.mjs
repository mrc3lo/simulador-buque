import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

// Ejecutar tras npm run build. Se prueba la API real contra un Supabase simulado.
test("acceso docente y alumno con la API de producción", { timeout: 30000 }, async (t) => {
  const owner = "11111111-1111-4111-8111-111111111111";
  const room = { id: "room-1", code: "ABC234", title: "Clase", status: "active", teacher_user_id: owner, teacher_pin_hash: createHash("sha256").update("test-secret:ABC234:1234").digest("hex") };
  const writes = [];
  const backend = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const url = new URL(req.url, "http://localhost");
    const token = req.headers.authorization?.replace("Bearer ", "");
    const user = (key) => ({ id: key === "other" ? "other-teacher" : owner, email: "profesor@example.com", app_metadata: key === "student" ? {} : { role: key === "admin" ? "admin" : "teacher" }, user_metadata: { role: "admin" } });
    res.setHeader("Content-Type", "application/json");
    const send = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)); };
    if (url.pathname === "/auth/v1/token") {
      if (body.password === "wrong") return send({}, 400);
      return send({ access_token: body.password, expires_in: 3600, user: user(body.password) });
    }
    if (url.pathname === "/auth/v1/user") return token === "expired" ? send({}, 401) : send(user(token));
    if (url.pathname === "/auth/v1/logout") return send({});
    if (req.method !== "GET") writes.push({ path: url.pathname, body });
    if (url.pathname === "/auth/v1/admin/users") {
      assert.equal(token, "test-key");
      if (body.email === "existing@example.com") return send({ code: "email_exists" }, 422);
      return send({ id: "new-teacher", email: body.email, app_metadata: body.app_metadata });
    }
    if (url.pathname === "/rest/v1/rooms") {
      if (req.method === "POST") return send([{ ...room, ...body }]);
      return send(url.searchParams.get("code") === "eq.ABC234" ? [room] : []);
    }
    if (url.pathname === "/rest/v1/participants") {
      if (req.method === "POST") return send([{ id: "participant-1", ...body }]);
      return send([{ id: "participant-1", display_name: "Participante", role: url.searchParams.get("token") === "eq.student-token" ? "student" : "teacher" }]);
    }
    return send([]);
  });
  backend.listen(0, "127.0.0.1");
  await once(backend, "listening");
  const portProbe = createServer();
  portProbe.listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const appPort = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)], {
    env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${backend.address().port}`, SUPABASE_SERVICE_ROLE_KEY: "test-key", APP_SECRET: "test-secret", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => { app.kill(); backend.closeAllConnections(); await new Promise((resolve) => backend.close(resolve)); });
  let output = "";
  const origin = await new Promise((resolve, reject) => {
    app.stdout.on("data", (chunk) => { output += chunk; const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/); if (match) resolve(match[0]); });
    app.once("exit", (code) => reject(new Error(`Next terminó: ${code}`)));
    app.stderr.on("data", () => {});
  });
  const call = async (path, { method = "POST", cookie, body = {}, originHeader = origin } = {}) => fetch(`${origin}${path}`, {
    method, headers: { "Content-Type": "application/json", Origin: originHeader, ...(cookie ? { Cookie: cookie } : {}) },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
  const teacherCookie = "maritime-teacher-session=teacher";
  await t.test("crear y recuperar exige login", async () => {
    assert.equal((await call("/api/rooms")).status, 401);
    assert.equal((await call("/api/rooms/ABC234/teacher", { body: { pin: "1234" } })).status, 401);
  });
  await t.test("contraseña incorrecta y rol en user_metadata no autorizan", async () => {
    assert.equal((await call("/api/auth/teacher", { body: { email: "a@example.com", password: "wrong" } })).status, 401);
    assert.equal((await call("/api/auth/teacher", { body: { email: "a@example.com", password: "student" } })).status, 403);
  });
  await t.test("login docente entrega cookie segura sin exponer token", async () => {
    const result = await call("/api/auth/teacher", { body: { email: "a@example.com", password: "teacher" } });
    assert.equal(result.status, 200);
    assert.match(result.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(result.headers.get("set-cookie"), /Secure/i);
    assert.match(result.headers.get("set-cookie"), /SameSite=strict/i);
    assert.equal((await result.json()).access_token, undefined);
  });
  await t.test("sesión expirada y origen ajeno se rechazan", async () => {
    assert.equal((await call("/api/rooms", { cookie: "maritime-teacher-session=expired" })).status, 401);
    assert.equal((await call("/api/rooms", { cookie: teacherCookie, originHeader: "https://otro.example" })).status, 403);
  });
  await t.test("profesor autenticado crea una clase con propietario", async () => {
    const result = await call("/api/rooms", { cookie: teacherCookie, body: { title: "Clase", teacherName: "Docente", pin: "1234" } });
    assert.equal(result.status, 201);
    assert.equal(writes.find((entry) => entry.path === "/rest/v1/rooms").body.teacher_user_id, owner);
  });
  await t.test("el propietario recupera y dirige su clase", async () => {
    assert.equal((await call("/api/auth/teacher", { method: "GET", cookie: teacherCookie })).status, 200);
    assert.equal((await call("/api/rooms/ABC234/teacher", { cookie: teacherCookie, body: { pin: "9999" } })).status, 401);
    assert.equal((await call("/api/rooms/ABC234/teacher", { cookie: teacherCookie, body: { pin: "1234" } })).status, 200);
    assert.equal((await call("/api/rooms/ABC234/actions", { cookie: teacherCookie, body: { type: "reset", token: "teacher-token" } })).status, 200);
  });
  await t.test("un docente no puede recuperar ni manejar la clase de otro", async () => {
    const cookie = "maritime-teacher-session=other";
    assert.equal((await call("/api/rooms/ABC234/teacher", { cookie, body: { pin: "1234" } })).status, 403);
    assert.equal((await call("/api/rooms/ABC234/actions", { cookie, body: { type: "reset", token: "teacher-token" } })).status, 403);
    assert.equal((await call("/api/rooms/ABC234/actions", { body: { type: "reset", token: "teacher-token" } })).status, 401);
  });
  await t.test("el alumno ingresa con nombre y código, agrega carga pero no reinicia", async () => {
    assert.equal((await call("/api/rooms/ABC234/join", { body: { displayName: "Alumno" } })).status, 201);
    assert.equal((await call("/api/rooms/ABC234/actions", { body: { type: "add", token: "student-token", side: "port", massKg: 30000, longitudinal: 0 } })).status, 200);
    assert.equal((await call("/api/rooms/ABC234/actions", { body: { type: "reset", token: "student-token" } })).status, 403);
  });
  await t.test("administradores acceden y registran profesores sin permitir elevar el rol", async () => {
    const login = await call("/api/auth/teacher", { body: { email: "admin@example.com", password: "admin" } });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).teacher.role, "admin");
    const cookie = "maritime-teacher-session=admin";
    assert.equal((await call("/api/rooms", { cookie, body: { title: "Clase admin", teacherName: "Admin", pin: "1234" } })).status, 201);
    const result = await call("/api/admin/teachers", { cookie, body: { name: "Docente", email: "NEW@example.com", password: "test-password", role: "admin", app_metadata: { role: "admin" } } });
    assert.equal(result.status, 201);
    assert.deepEqual(await result.json(), { teacher: { id: "new-teacher", email: "new@example.com", role: "teacher" } });
    assert.equal(writes.find((entry) => entry.path === "/auth/v1/admin/users").body.app_metadata.role, "teacher");
    assert.equal((await call("/api/admin/teachers", { cookie, body: { name: "Docente", email: "existing@example.com", password: "test-password" } })).status, 409);
    assert.equal((await call("/api/admin/teachers", { cookie, body: { name: "Docente", email: "bad-email", password: "test-password" } })).status, 400);
    assert.equal((await call("/api/admin/teachers", { cookie, body: { name: "Docente", email: "valid@example.com", password: "short" } })).status, 400);
  });
  await t.test("solo administradores pueden crear cuentas, con validación de origen", async () => {
    const count = writes.length;
    assert.equal((await call("/api/admin/teachers")).status, 401);
    assert.equal((await call("/api/admin/teachers", { cookie: teacherCookie })).status, 403);
    assert.equal((await call("/api/admin/teachers", { cookie: "maritime-teacher-session=student" })).status, 403);
    assert.equal((await call("/api/admin/teachers", { cookie: "maritime-teacher-session=admin", originHeader: "https://otro.example" })).status, 403);
    assert.equal(writes.length, count);
  });
  await t.test("cerrar sesión elimina la cookie", async () => {
    const result = await call("/api/auth/teacher", { method: "DELETE", cookie: teacherCookie });
    assert.equal(result.status, 200);
    assert.match(result.headers.get("set-cookie"), /Max-Age=0/i);
  });
});
