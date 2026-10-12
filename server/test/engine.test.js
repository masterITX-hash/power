import test from "node:test";
import assert from "node:assert/strict";
import { calculateRisk, recommendation } from "../src/engine.js";

const threshold = { dp_normal: 1.4, dp_warning: 2, dp_critical: 2.6, design_flow: 6500, rate_warning: 0.25 };

test("normal reading stays normal", () => {
  const result = calculateRisk({ differential_pressure: 0.8, flow_rate: 6400, sensor_status: "ONLINE" }, null, threshold);
  assert.equal(result.status, "NORMAL");
  assert.ok(result.risk_score <= 30);
});

test("critical pressure overrides weighted score", () => {
  const result = calculateRisk({ differential_pressure: 2.8, flow_rate: 6000, sensor_status: "ONLINE" }, null, threshold);
  assert.equal(result.status, "CRITICAL");
  assert.ok(result.risk_score >= 72);
});

test("offline sensor returns offline decision", () => {
  const result = calculateRisk({ differential_pressure: 0, flow_rate: 0, sensor_status: "OFFLINE" }, null, threshold);
  assert.equal(result.status, "OFFLINE");
  assert.match(recommendation(result.status), /gateway/);
});
