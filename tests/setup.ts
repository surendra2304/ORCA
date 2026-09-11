import { vi } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Leaflet
vi.mock('leaflet', () => {
  const layerGroupMock = {
    addTo: vi.fn().mockReturnThis(),
    addLayer: vi.fn(),
    clearLayers: vi.fn(),
    removeLayer: vi.fn(),
  };

  const mapMock = {
    setView: vi.fn().mockReturnThis(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    remove: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  };

  return {
    default: {
      map: vi.fn().mockReturnValue(mapMock),
      tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      layerGroup: vi.fn().mockReturnValue(layerGroupMock),
      divIcon: vi.fn().mockReturnValue({}),
      marker: vi.fn().mockReturnValue({
        bindPopup: vi.fn().mockReturnThis(),
        openPopup: vi.fn(),
        on: vi.fn(),
      }),
      polyline: vi.fn().mockReturnValue({}),
      circle: vi.fn().mockReturnValue({}),
      polygon: vi.fn().mockReturnValue({}),
    },
  };
});

// Mock SpeechSynthesis
const mockVoices = [
  { name: 'Google हिन्दी', lang: 'hi-IN', default: false, localService: true, voiceURI: 'hi' },
  { name: 'Microsoft Heera - English (India)', lang: 'en-IN', default: true, localService: true, voiceURI: 'en' },
];

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: vi.fn((utterance) => {
      if (utterance.onstart) utterance.onstart();
      setTimeout(() => {
        if (utterance.onend) utterance.onend();
      }, 50);
    }),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn().mockReturnValue(mockVoices),
    onvoiceschanged: null,
  },
});

class MockSpeechSynthesisUtterance {
  text: string;
  lang: string = 'en-US';
  rate: number = 1;
  pitch: number = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string = '') {
    this.text = text;
  }
}

(window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
(global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
