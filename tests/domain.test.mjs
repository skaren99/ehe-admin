import test from "node:test";
import assert from "node:assert/strict";
import { money } from "../src/domain.mjs";
test("prices display cents and EUR in the existing locale", () => {
  assert.match(money(70.1), /70,10/);
  assert.match(money(70.1), /€/);
});
