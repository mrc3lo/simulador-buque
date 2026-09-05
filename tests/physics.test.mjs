import assert from "node:assert/strict";
import test from "node:test";

const L = 40;
const B = 12;
const T0 = 2;
const RHO = 1025;
const EMPTY_MASS = L * B * T0 * RHO;

function metrics(loads) {
  let mass = EMPTY_MASS;
  let vertical = EMPTY_MASS * 2.5;
  let transverse = 0;
  for (const load of loads) {
    mass += load.mass;
    vertical += load.mass * load.height;
    transverse += load.mass * load.y;
  }
  const volume = mass / RHO;
  const draft = volume / (L * B);
  const kb = draft / 2;
  const bm = (L * B ** 3 / 12) / volume;
  const kg = vertical / mass;
  const gm = kb + bm - kg;
  return { mass, draft, gm, transverse };
}

test("el buque vacío conserva el calado inicial", () => {
  const result = metrics([]);
  assert.equal(result.mass, 984000);
  assert.equal(result.draft, 2);
  assert.ok(result.gm > 0);
});

test("cargas simétricas no generan momento transversal", () => {
  const result = metrics([
    { mass: 30000, height: 4.5, y: -3 },
    { mass: 30000, height: 4.5, y: 3 },
  ]);
  assert.equal(result.transverse, 0);
  assert.ok(result.draft > T0);
});

test("una carga a babor genera momento con signo de babor", () => {
  const result = metrics([{ mass: 30000, height: 4.5, y: -3 }]);
  assert.equal(result.transverse, -90000);
});
