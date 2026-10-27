// The background page: the hub's room, and the only room it needs. One
// call stands the book up and it keeps for the browser's lifetime of every
// tab that speaks to it — there is no start to await, nothing to tear down,
// and nothing the pages could postpone behind their own boot order.
//
// The eye at the bus hangs beside the book, and the wiring is the whole
// architecture in one line: the tap hears the wire and names the frame a
// request crossed; the hub, whose keys are the same browser-attested
// frameIds, writes the warmth where it belongs and knocks on the frame's
// own port. Two factories, no shared state, and each hears what only it
// can.
import { createFrameHub } from './hub.js';
import { createWireTap } from './network.js';

const hub = createFrameHub(browser);
createWireTap(browser, hub.strain);
