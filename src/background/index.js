// The background page: the hub's room, and the only room it needs. One
// call stands the book up and it keeps for the browser's lifetime of every
// tab that speaks to it — there is no start to await, nothing to tear down,
// and nothing the pages could postpone behind their own boot order.
import { createFrameHub } from './hub.js';

createFrameHub(browser);
