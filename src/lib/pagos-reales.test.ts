import assert from "node:assert/strict";
import test from "node:test";
import { pagosRealesHabilitados } from "./pagos-reales";

const configured = {
  NODE_ENV: "production",
  RCKTX_ENABLE_REAL_PAYMENTS: "true",
  CULQI_SECRET_KEY: "test-provider-secret",
  CULQI_WEBHOOK_SECRET: "test-webhook-secret",
};

test("real payments default to disabled", () => {
  assert.equal(pagosRealesHabilitados({}), false);
});

test("a preview or development server cannot charge even with credentials", () => {
  for (const NODE_ENV of ["development", "test", undefined]) {
    assert.equal(pagosRealesHabilitados({ ...configured, NODE_ENV }), false);
  }
});

test("a production deployment needs explicit opt-in and both credentials", () => {
  assert.equal(pagosRealesHabilitados({ ...configured, RCKTX_ENABLE_REAL_PAYMENTS: "false" }), false);
  assert.equal(pagosRealesHabilitados({ ...configured, RCKTX_ENABLE_REAL_PAYMENTS: undefined }), false);
  assert.equal(pagosRealesHabilitados({ ...configured, CULQI_SECRET_KEY: " " }), false);
  assert.equal(pagosRealesHabilitados({ ...configured, CULQI_WEBHOOK_SECRET: undefined }), false);
  assert.equal(pagosRealesHabilitados(configured), true);
});
