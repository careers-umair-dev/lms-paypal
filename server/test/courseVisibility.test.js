import test from 'node:test';
import assert from 'node:assert/strict';
import { isCourseVisible } from '../utils/courseVisibility.js';

test('published courses are visible to everyone', () => {
  assert.equal(isCourseVisible({ published: true }, null), true);
});

test('unpublished courses are hidden from students and guests', () => {
  assert.equal(isCourseVisible({ published: false }, null), false);
  assert.equal(isCourseVisible({ published: false }, { role: 'Student' }), false);
});

test('staff can preview unpublished courses', () => {
  assert.equal(isCourseVisible({ published: false }, { role: 'Admin' }), true);
  assert.equal(isCourseVisible({ published: false }, { role: 'Instructor' }), true);
});

test('enrolled students retain access to unpublished courses', () => {
  assert.equal(isCourseVisible({ published: false }, { role: 'Student' }, true), true);
});