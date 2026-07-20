// Plain Node assertions for collision detection logic.
// Run with: node tests/collision.test.js
const assert = require('assert');
const { circleRectCollision, checkObstacleCollisions, checkFinishCollision } = require('../src/collision.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

test('circle far from rect does not collide', () => {
  const rect = { x: 100, y: 100, width: 40, height: 40 };
  assert.strictEqual(circleRectCollision(0, 0, 10, rect), false);
});

test('circle centered inside rect collides', () => {
  const rect = { x: 100, y: 100, width: 40, height: 40 };
  assert.strictEqual(circleRectCollision(120, 120, 10, rect), true);
});

test('circle touching rect edge collides (overlap)', () => {
  // rect spans x:[100,140]. circle center at x=145, radius 10 -> closest point x=140, dx=5 < radius
  const rect = { x: 100, y: 100, width: 40, height: 40 };
  assert.strictEqual(circleRectCollision(145, 120, 10, rect), true);
});

test('circle just outside rect corner does not collide', () => {
  // closest point is corner (140,140); distance from (150,150) is sqrt(200) ~= 14.14 > radius 10
  const rect = { x: 100, y: 100, width: 40, height: 40 };
  assert.strictEqual(circleRectCollision(150, 150, 10, rect), false);
});

test('circle overlapping rect corner does collide', () => {
  // same corner, but radius large enough to reach it
  const rect = { x: 100, y: 100, width: 40, height: 40 };
  assert.strictEqual(circleRectCollision(150, 150, 15, rect), true);
});

test('checkObstacleCollisions returns false with no obstacles', () => {
  const car = { x: 0, y: 0, radius: 10 };
  assert.strictEqual(checkObstacleCollisions(car, []), false);
});

test('checkObstacleCollisions detects a hit among several obstacles', () => {
  const car = { x: 500, y: 500, radius: 12 };
  const obstacles = [
    { x: 0, y: 0, width: 20, height: 20 },
    { x: 495, y: 495, width: 10, height: 10 },
    { x: 900, y: 900, width: 20, height: 20 },
  ];
  assert.strictEqual(checkObstacleCollisions(car, obstacles), true);
});

test('checkObstacleCollisions returns false when car misses all obstacles', () => {
  const car = { x: 500, y: 500, radius: 5 };
  const obstacles = [
    { x: 0, y: 0, width: 20, height: 20 },
    { x: 900, y: 900, width: 20, height: 20 },
  ];
  assert.strictEqual(checkObstacleCollisions(car, obstacles), false);
});

test('checkFinishCollision true when car overlaps finish rect', () => {
  const finish = { x: 2480, y: 3700, width: 40, height: 250 };
  const car = { x: 2495, y: 3800, radius: 15 };
  assert.strictEqual(checkFinishCollision(car, finish), true);
});

test('checkFinishCollision false when car has not reached finish rect', () => {
  const finish = { x: 2480, y: 3700, width: 40, height: 250 };
  const car = { x: 1000, y: 3800, radius: 15 };
  assert.strictEqual(checkFinishCollision(car, finish), false);
});

console.log(`\n${passed} passed`);
