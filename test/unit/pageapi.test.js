import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findApiAncestor } from '../../src/content/video/pageapi.js';

// The climb’s memory, told through families that count who was asked:
// the video element answers `parentElement` with a walk counted, and
// `contains` with whatever the family’s story is at that moment. The
// page-facing object hangs off the ancestor’s `wrappedJSObject`, the
// same waiver a real page element offers.
const makeVideo = (ofFamily) => {
  const walked = [];
  let current = ofFamily.host;
  return {
    walked,
    get parentElement() {
      walked.push(current);
      return current;
    },
    contains: (node) => node === current,
    move: (next) => {
      current = next;
    },
  };
};

test('the climb is walked once and answered from the memory after', () => {
  const pageApi = { getAvailableQualityLevels: () => {} };
  const video = makeVideo({ host: { wrappedJSObject: pageApi } });
  const names = ['getAvailableQualityLevels'];

  assert.equal(findApiAncestor(video, names), pageApi);
  assert.equal(video.walked.length, 1, 'one walk paid');

  // The same ask about the same family is the memory’s to answer: the
  // `contains` reading says the element is still of the family, and no
  // walker is heard.
  assert.equal(findApiAncestor(video, names), pageApi);
  assert.equal(video.walked.length, 1, 'the second ask is the memory’s');
});

test('a family the element fell out of is walked again', () => {
  const pageApi = { getOption: () => {} };
  const video = makeVideo({ host: { wrappedJSObject: pageApi } });
  const names = ['getOption'];

  assert.equal(findApiAncestor(video, names), pageApi);
  assert.equal(video.walked.length, 1);

  // The element is no longer of the family the memory holds: the one
  // `contains` reading fails, the memory is dropped, and the walk is
  // paid again — finding nothing on the family there now is.
  video.move({ parentElement: null });
  assert.equal(findApiAncestor(video, names), null);
  assert.equal(video.walked.length, 2, 'the old memory stood down');

  // And a family found again is remembered in its turn.
  const nextApi = { levels: [], currentLevel: 0 };
  const nextHost = { wrappedJSObject: nextApi, parentElement: null };
  video.move(nextHost);
  assert.equal(findApiAncestor(video, names), null, 'the names still rule');
  assert.equal(video.walked.length, 3);
});

test('a climb that finds nothing keeps walking when asked again', () => {
  const host = { parentElement: null };
  const walked = { count: 0 };
  const video = {
    get parentElement() {
      walked.count += 1;
      return host;
    },
    contains: () => true,
  };
  const names = ['getAvailableQualityLevels'];

  assert.equal(findApiAncestor(video, names), null);
  assert.equal(findApiAncestor(video, names), null);
  assert.equal(walked.count, 2, 'no absence is kept');

  // The family gains its name later: the next ask finds it, which is
  // exactly what a remembered absence would have cost the page.
  const pageApi = { getAvailableQualityLevels: () => {} };
  host.wrappedJSObject = pageApi;
  assert.equal(findApiAncestor(video, names), pageApi);
  assert.equal(walked.count, 3);
});

test('a climb with different names is a different climb', () => {
  const pageApi = { getOption: () => {} };
  const video = makeVideo({
    host: { wrappedJSObject: pageApi, parentElement: null },
  });
  const byOption = ['getOption'];

  assert.equal(findApiAncestor(video, byOption), pageApi);
  assert.equal(video.walked.length, 1);

  // The same family, a different question: the memory does not answer
  // it, and the walk is paid again — where the question finds nothing,
  // because the family only ever carried the first name.
  assert.equal(findApiAncestor(video, ['levels']), null);
  assert.equal(video.walked.length, 2, 'the different ask paid its walk');

  // The first ask’s memory still stands: the failed second climb did
  // not put it out.
  assert.equal(findApiAncestor(video, byOption), pageApi);
  assert.equal(video.walked.length, 2, 'the first ask is still remembered');
});
