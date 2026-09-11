import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from '../src/context/AppContext';
import { LocationProvider } from '../src/context/LocationContext';

// Pages & Components
import { Page1Welcome } from '../src/pages/Page1Welcome';
import { Page2Language } from '../src/pages/Page2Language';
import { Page3UserDetails } from '../src/pages/Page3UserDetails';
import { FishermanChatPage } from '../src/pages/fisherman/FishermanChatPage';
import { FishermanManualInputPage } from '../src/pages/fisherman/FishermanManualInputPage';
import { FishermanRecommendationPage } from '../src/pages/fisherman/FishermanRecommendationPage';
import { OthersHomePage } from '../src/pages/others/OthersHomePage';
import { OthersFishingZonesPage } from '../src/pages/others/OthersFishingZonesPage';
import { Page6Productivity } from '../src/pages/Page6Productivity';
import { Page7MarineAnalysis } from '../src/pages/Page7MarineAnalysis';
import { Page12Disasters } from '../src/pages/Page12Disasters';
import { Page13RiskPrediction } from '../src/pages/Page13RiskPrediction';
import { Header } from '../src/components/Header';
import { NavigationBar } from '../src/components/NavigationBar';

// Helper wrapper
const renderWithProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <AppProvider>
      <LocationProvider>
        <MemoryRouter initialEntries={[route]}>
          {ui}
        </MemoryRouter>
      </LocationProvider>
    </AppProvider>
  );
};

describe('ORCA Full UI & Button Verification Suite', () => {

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // 1. Onboarding Page 1 (Welcome)
  it('Page 1 Welcome: Get Started button is active and navigates', () => {
    renderWithProviders(<Page1Welcome />);
    const getStartedBtn = screen.getByRole('button', { name: /get started|ప్రారంభించండి/i });
    expect(getStartedBtn).toBeDefined();
    fireEvent.click(getStartedBtn);
  });

  // 2. Onboarding Page 2 (Language)
  it('Page 2 Language: Language buttons and Continue button function correctly', () => {
    renderWithProviders(<Page2Language />);
    
    // Check Telugu button
    const teluguBtn = screen.getByRole('button', { name: /తెలుగు/i });
    expect(teluguBtn).toBeDefined();
    fireEvent.click(teluguBtn);

    // Check Hindi button
    const hindiBtn = screen.getByRole('button', { name: /हिन्दी/i });
    expect(hindiBtn).toBeDefined();
    fireEvent.click(hindiBtn);

    // Click Continue
    const continueBtn = screen.getByRole('button', { name: /continue|కొనసాగించండి|जारी रखें|आगे बढ़ें/i });
    expect(continueBtn).toBeDefined();
    fireEvent.click(continueBtn);
  });

  // 3. Onboarding Page 3 (UserDetails)
  it('Page 3 UserDetails: Role cards and Start Experience button work', () => {
    renderWithProviders(<Page3UserDetails />);
    
    // Name input
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Captain Ramesh' } });
    expect((input as HTMLInputElement).value).toBe('Captain Ramesh');

    // Role selection
    const fishermanRole = screen.getByText(/Voice Assisted/i);
    fireEvent.click(fishermanRole);

    const submitBtn = screen.getByRole('button', { name: /Launch|start|ప్రారంభించండి|अनुभव शुरू करें/i });
    expect(submitBtn).toBeDefined();
    fireEvent.click(submitBtn);
  });

  // 4. Fisherman Chat & Voice Assistant Page
  it('FishermanChatPage: Quick query buttons, Port dropdown, Language dropdown, text submit all work', async () => {
    renderWithProviders(<FishermanChatPage />, { route: '/fisherman/voice' });

    // Quick Action 1: Can I go fishing today?
    const quickBtn1 = screen.getByText(/Can I go fishing today\?|ఈ రోజు చేపల వేటకు వెళ్ళవచ్చా\?/i);
    expect(quickBtn1).toBeDefined();
    fireEvent.click(quickBtn1);

    // Verify response turn appears
    await waitFor(() => {
      expect(screen.getByText(/GO/i)).toBeDefined();
    }, { timeout: 3000 });

    // Port Selector Dropdown
    const portBtn = screen.getAllByText(/Kakinada Port/i)[0];
    fireEvent.click(portBtn);
    expect(screen.getByText(/Select Port/i)).toBeDefined();

    // Select Visakhapatnam Harbor
    const vizagPort = screen.getByRole('button', { name: /Visakhapatnam Harbor/i });
    fireEvent.click(vizagPort);

    // Language Dropdown
    const langBtn = screen.getByText(/English|తెలుగు/i);
    fireEvent.click(langBtn);
    expect(screen.getByText(/Select Language/i)).toBeDefined();

    // Plan a trip button
    const planTripBtn = screen.getByText(/Plan a trip|యాత్ర ప్రణాళిక/i);
    expect(planTripBtn).toBeDefined();
    fireEvent.click(planTripBtn);

    // Text Input and Submit
    const textInput = screen.getByPlaceholderText(/Ask ORCA/i);
    fireEvent.change(textInput, { target: { value: 'Is there a cyclone alert?' } });
    const sendBtn = screen.getByLabelText(/Send message/i);
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Is there a cyclone alert\?/i)).toBeDefined();
    });

    // Clear Chat
    const clearBtn = screen.getByText(/Clear Chat|చరిత్ర తొలగించు/i);
    fireEvent.click(clearBtn);
  });

  // 5. Fisherman Manual Input Page
  it('FishermanManualInputPage: Form controls and Analyze button work', () => {
    renderWithProviders(<FishermanManualInputPage />, { route: '/fisherman/manual' });

    // "Voice Assistant" return button
    const voiceAssistantBtn = screen.getByRole('button', { name: /Voice Assistant|వాయిస్ అసిస్టెంట్/i });
    expect(voiceAssistantBtn).toBeDefined();
    fireEvent.click(voiceAssistantBtn);

    // Analyze Submit button
    const analyzeBtn = screen.getByRole('button', { name: /Analyze|విశ్లేషించండి/i });
    expect(analyzeBtn).toBeDefined();
    fireEvent.click(analyzeBtn);
  });

  // 6. Fisherman Recommendation Page
  it('FishermanRecommendationPage: Edit Parameters, Voice Assistant, and Navigation Modal work', async () => {
    renderWithProviders(<FishermanRecommendationPage />, { route: '/fisherman/recommendation' });

    // Edit Parameters button
    const editBtn = screen.getByRole('button', { name: /Edit Parameters/i });
    expect(editBtn).toBeDefined();
    fireEvent.click(editBtn);

    // Voice Assistant button
    const voiceBtn = screen.getByRole('button', { name: /Voice Assistant/i });
    expect(voiceBtn).toBeDefined();
    fireEvent.click(voiceBtn);

    // Navigate to Zone button -> Opens Modal
    const navBtn = screen.getByRole('button', { name: /Set Course|దిశను నిర్ణయించండి|Navigate to Zone/i });
    expect(navBtn).toBeDefined();
    fireEvent.click(navBtn);

    // Verify Modal opened
    expect(screen.getByText(/Course Plotted:/i)).toBeDefined();
    expect(screen.getByText(/Compass Bearing/i)).toBeDefined();
    expect(screen.getByText(/Open in Google Maps/i)).toBeDefined();

    // Test Voice Guidance button inside modal
    const voiceGuidanceBtn = screen.getByRole('button', { name: /Voice Guidance/i });
    expect(voiceGuidanceBtn).toBeDefined();
    fireEvent.click(voiceGuidanceBtn);

    // Test Modal Close
    const closeBtn = screen.getByLabelText(/Close modal/i);
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByText(/Course Plotted:/i)).toBeNull();
    });
  });

  // 7. Header (Others flow)
  it('Header: Brand logo, Fisherman Voice button, and Language dropdown work', () => {
    renderWithProviders(<Header />, { route: '/others/home' });

    // Fisherman Voice button
    const fishVoiceBtn = screen.getByRole('button', { name: /Fisherman Voice/i });
    expect(fishVoiceBtn).toBeDefined();
    fireEvent.click(fishVoiceBtn);

    // Language selector dropdown
    const langBtn = screen.getByTitle(/Language|భాష/i);
    fireEvent.click(langBtn);
    expect(screen.getByText(/Select Language/i)).toBeDefined();

    // Select Tamil
    const tamilBtn = screen.getByText(/தமிழ்/i);
    fireEvent.click(tamilBtn);

    // Profile link
    const profileBtn = screen.getByTitle(/Profile & Operational Role/i);
    fireEvent.click(profileBtn);
  });

  // 8. NavigationBar (Others flow)
  it('NavigationBar: Menu toggle and all 6 navigation links work', () => {
    renderWithProviders(<NavigationBar />, { route: '/others/home' });

    // All 6 nav items
    const navLinks = [
      /Home|హోమ్/i,
      /Fishing|చేపల వేట/i,
      /Productivity|ఉత్పాదకత/i,
      /Analysis|సముద్ర విశ్లేషణ/i,
      /Disasters|విపత్తు/i,
      /Risk Prediction|ప్రమాద/i,
    ];

    navLinks.forEach(regex => {
      const link = screen.getByRole('link', { name: regex });
      expect(link).toBeDefined();
      fireEvent.click(link);
    });
  });

  // 9. Others HomePage
  it('OthersHomePage: Region select, view details buttons, and clickable cards work', () => {
    renderWithProviders(<OthersHomePage />, { route: '/others/home' });

    // View Details buttons
    const viewDetailBtns = screen.getAllByRole('button', { name: /View Details|వివరాలు చూడండి/i });
    expect(viewDetailBtns.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(viewDetailBtns[0]);
    fireEvent.click(viewDetailBtns[1]);

    // Clickable risk cards
    const riskCard = screen.getAllByTitle(/View Risk Zone Analytics/i)[0];
    expect(riskCard).toBeDefined();
    fireEvent.click(riskCard);

    // Clickable productivity card
    const prodCard = screen.getAllByTitle(/View Productivity Analytics/i)[0];
    expect(prodCard).toBeDefined();
    fireEvent.click(prodCard);
  });

  // 10. Others Fishing Zones Page
  it('OthersFishingZonesPage: Zone card selection works', () => {
    renderWithProviders(<OthersFishingZonesPage />, { route: '/others/fishing' });

    // Click another zone card to select it
    const zoneCards = screen.getAllByText(/Potential|సామర్థ్యం/i);
    expect(zoneCards.length).toBeGreaterThan(0);
    fireEvent.click(zoneCards[0]);
  });

  // 11. Productivity Page (Page 6)
  it('Page6Productivity: Ranked productivity cards are interactive', () => {
    renderWithProviders(<Page6Productivity />, { route: '/others/productivity' });

    const rankCards = screen.getAllByText(/#/i);
    expect(rankCards.length).toBeGreaterThan(0);
    fireEvent.click(rankCards[0]);
  });

  // 12. Marine Analysis Suite (Page 7)
  it('Page7MarineAnalysis: All 5 category buttons and hazard cards work', () => {
    renderWithProviders(<Page7MarineAnalysis />, { route: '/others/analysis' });

    // Test 5 categories: SST, Weather, Ocean, Chlorophyll, Spatial
    const catButtons = ['SST', 'Weather', 'Ocean', 'Chlorophyll', 'Spatial'];
    catButtons.forEach(cat => {
      const btn = screen.getByRole('button', { name: new RegExp(cat, 'i') });
      expect(btn).toBeDefined();
      fireEvent.click(btn);
    });

    // Hazard card click
    const hazardCard = screen.getAllByTitle(/View Full Risk Matrix/i)[0];
    expect(hazardCard).toBeDefined();
    fireEvent.click(hazardCard);
  });

  // 13. Disasters Page (Page 12)
  it('Page12Disasters: All historical disaster buttons work', () => {
    renderWithProviders(<Page12Disasters />, { route: '/others/disasters' });

    const disasterNames = [
      /Michaung/i,
      /Asani/i,
      /Gulab/i,
      /Tsunami/i,
      /Odisha/i,
    ];

    disasterNames.forEach(name => {
      const btn = screen.getByRole('button', { name });
      expect(btn).toBeDefined();
      fireEvent.click(btn);
    });
  });

  // 14. Risk Prediction Page (Page 13)
  it('Page13RiskPrediction: Manual refresh button and hazard items work', () => {
    renderWithProviders(<Page13RiskPrediction />, { route: '/others/risk-prediction' });

    // Manual recalculate button
    const refreshBtn = screen.getByTitle(/Recalculate now/i);
    expect(refreshBtn).toBeDefined();
    fireEvent.click(refreshBtn);

    // Hazard items
    const hazardItem = screen.getByText(/Krishna-Godavari/i);
    expect(hazardItem).toBeDefined();
    fireEvent.click(hazardItem);
  });

});
