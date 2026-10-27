import {
  isHostEnabled,
  readSettings,
  resetSettings,
  setHostEnabled,
} from '../lib/settings.js';
import { askState } from '../lib/protocol.js';

const hostLabel = document.getElementById('site-host');
const enabledToggle = document.getElementById('site-enabled');
const statusLine = document.getElementById('status');
const resetButton = document.getElementById('reset');

const readActiveTab = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs.length > 0 ? tabs[0] : null;
};

const readHost = (tab) => {
  if (!tab?.url) return null;
  try {
    const url = new URL(tab.url);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.host
      : null;
  } catch (error) {
    console.error('Nocturne: unreadable tab url', error);
    return null;
  }
};

const describeVideo = async (tab) => {
  if (!tab) return 'No page to inspect.';
  try {
    // The ask goes to the background's hub, which keeps the book of every
    // frame's films for the tab: one message, no round trip through the
    // pages, and the answer is the whole tab's count whatever frame of it
    // the film lives in.
    const state = await browser.runtime.sendMessage(askState(tab.id));
    if (state?.videoCount > 0) {
      const plural = state.videoCount === 1 ? 'video' : 'videos';
      return `${state.videoCount} ${plural} detected on this page.`;
    }
    // The count is silent, but the network's book is not: a film streams
    // in a frame of this page whose element the DOM cannot confirm — an
    // embed with no script of ours inside it, or a stream running without
    // an element of its own. Answered as its own line of context, never
    // counted as a video.
    if (state?.streams > 0) {
      const streamPlural = state.streams === 1 ? 'stream' : 'streams';
      const frames = state.streams === 1 ? 'a frame' : 'some frames';
      const line = `detected in ${frames} of this page.`;
      return `${state.streams} media ${streamPlural} ${line}`;
    }
    return 'No video detected on this page yet.';
  } catch {
    return 'Not active on this page.';
  }
};

const render = async () => {
  const tab = await readActiveTab();
  const host = readHost(tab);
  const settings = await readSettings();

  if (host === null) {
    hostLabel.textContent = 'unsupported page';
    enabledToggle.checked = false;
    enabledToggle.disabled = true;
  } else {
    hostLabel.textContent = host;
    enabledToggle.checked = isHostEnabled(settings, host);
    enabledToggle.disabled = false;
    enabledToggle.onchange = () => setHostEnabled(host, enabledToggle.checked);
  }

  statusLine.textContent = await describeVideo(tab);
};

// A reset puts the add-on back the way it was installed: the one button that
// does it.
resetButton.addEventListener('click', async () => {
  await resetSettings();
  await render();
  statusLine.textContent = 'Settings reset.';
});

// The full settings live on their own page — sliders, the diagnostics switch,
// the whole site list — and the toolbar button opens it without a new
// permission.
document.getElementById('open-options').addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

render();
