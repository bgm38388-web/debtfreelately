import assert from 'node:assert/strict';
import test from 'node:test';
import {swipeDirection} from './dist/discover-swipe.mjs';

test('only deliberate horizontal drags complete a Discover swipe', () => {
  assert.equal(swipeDirection(-85, 15), 'left');
  assert.equal(swipeDirection(85, -15), 'right');
  assert.equal(swipeDirection(69, 0), null);
  assert.equal(swipeDirection(-120, 100), null);
});
