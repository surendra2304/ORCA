export type SupportedLanguage = 'en' | 'te' | 'hi' | 'ta';

export interface Translations {
  common: {
    appName: string;
    tagline: string;
    loading: string;
    error: string;
    retry: string;
    close: string;
    save: string;
  };
  nav: {
    home: string;
    dashboard: string;
    analytics: string;
    pfzAreas: string;
    settings: string;
    help: string;
    logout: string;
    emergency: string;
    activeVessel: string;
  };
  header: {
    goodMorning: string;
    goodAfternoon: string;
    goodEvening: string;
    homeSubtitle: string;
    dashboardTitle: string;
    dashboardSubtitle: string;
    analyticsTitle: string;
    analyticsSubtitle: string;
    pfzTitle: string;
    pfzSubtitle: string;
    settingsTitle: string;
    settingsSubtitle: string;
    accountSettings: string;
    logout: string;
    language: string;
  };
  voice: {
    title: string;
    badge: string;
    hint: string;
    startBtn: string;
    stopBtn: string;
    listening: string;
    listeningDesc: string;
    processing: string;
    processingDesc: string;
    speaking: string;
    yourQuestion: string;
    orcaResponse: string;
    viewHistory: string;
    hideHistory: string;
    historyEmpty: string;
    voiceLangTitle: string;
    langAutoNotice: string;
    turnComplete: string;
    askAnother: string;
    replayVoice: string;
    turn: string;
    turns: string;
    historyNotice: string;
  };
  chat: {
    title: string;
    subtitle: string;
    inputPlaceholder: string;
    send: string;
    clear: string;
    suggestionsTitle: string;
    thinking: string;
    emptyNotice: string;
    suggestions: string[];
  };
  weatherCard: {
    title: string;
    predictions: string;
    liveApi: string;
    updated: string;
    airTemp: string;
    windGusts: string;
    wavesSwell: string;
    rainSst: string;
    gusts: string;
    swell: string;
    sst: string;
    hourlyTimeline: string;
    scrollHorizontal: string;
    fair: string;
    realtime: string;
    forceRefresh: string;
  };
  dashboard: {
    kpiTrips: string;
    kpiCatch: string;
    kpiAvgCatch: string;
    kpiBestZone: string;
    vsLastWeek: string;
    liveSeaConditions: string;
    seaTempSst: string;
    windSpeed: string;
    waveHeight: string;
    tideLevel: string;
    safetyVerdict: string;
    thermalMapTitle: string;
    thermalFront: string;
    highPotentialZones: string;
    viewAllZones: string;
    liveData: string;
    fetching: string;
    optimal: string;
    marginal: string;
    unfavorable: string;
    tideRising: string;
    tideFalling: string;
    seaStateCalm: string;
    seaStateSlight: string;
    seaStateModerate: string;
    seaStateRough: string;
  };
  pfz: {
    title: string;
    subtitle: string;
    allZones: string;
    high: string;
    moderate: string;
    distance: string;
    depth: string;
    species: string;
    suitability: string;
    viewOnMap: string;
    zoneDetails: string;
    recommendation: string;
  };
  analytics: {
    title: string;
    subtitle: string;
    catchHistory: string;
    speciesBreakdown: string;
    fuelEfficiency: string;
    successRate: string;
    tripsOverview: string;
  };
  settings: {
    title: string;
    profileTitle: string;
    vesselTitle: string;
    preferences: string;
    notifications: string;
    darkMode: string;
    saveBtn: string;
    captain: string;
    harbor: string;
  };
  modals: {
    alertsTitle: string;
    markAllRead: string;
    supportTitle: string;
    emergencyCall: string;
    close: string;
    coastGuard: string;
    supportDesc: string;
  };
  metrics: {
    seaConditions: string;
    windSpeed: string;
    waveHeight: string;
    waterTemp: string;
    visibility: string;
    safetyVerdict: string;
    safeToSail: string;
    cautionAdvised: string;
    dangerStayPort: string;
    knots: string;
    meters: string;
    celsius: string;
    km: string;
  };
  login: {
    title: string;
    signUpTitle: string;
    subtitle: string;
    langLabel: string;
    usernameLabel: string;
    passwordLabel: string;
    rememberMe: string;
    forgotPassword: string;
    loginBtn: string;
    signUpBtn: string;
    demoLoginBtn: string;
    alreadyAccount: string;
    dontHaveAccount: string;
    switchSignUp: string;
    switchLogin: string;
  };
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    common: {
      appName: 'ORCA Fishermen',
      tagline: 'Smart marine intelligence for safer and better fishing.',
      loading: 'Loading...',
      error: 'An error occurred. Please try again.',
      retry: 'Retry',
      close: 'Close',
      save: 'Save Changes',
    },
    nav: {
      home: 'Home',
      dashboard: 'Dashboard',
      analytics: 'Analytics',
      pfzAreas: 'PFZ Areas',
      settings: 'Settings',
      help: 'Help & Support',
      logout: 'Logout',
      emergency: 'SOS Emergency',
      activeVessel: 'Active Vessel',
    },
    header: {
      goodMorning: 'Good Morning',
      goodAfternoon: 'Good Afternoon',
      goodEvening: 'Good Evening',
      homeSubtitle: 'Your smart companion for safe and successful fishing.',
      dashboardTitle: 'Dashboard',
      dashboardSubtitle: 'Overview of your fishing activities and conditions.',
      analyticsTitle: 'Analytics',
      analyticsSubtitle: 'Track your performance and catch insights.',
      pfzTitle: 'PFZ Areas',
      pfzSubtitle: 'Potential Fishing Zone information and suitability.',
      settingsTitle: 'Settings',
      settingsSubtitle: 'Manage your profile, preferences and app settings.',
      accountSettings: 'Account Settings',
      logout: 'Logout',
      language: 'Language',
    },
    voice: {
      title: 'Voice AI Co-Pilot',
      badge: 'Live Realtime Voice',
      hint: 'Tap the mic and speak your question naturally. Speak in English, Telugu, or Hindi — ORCA will reply in your language!',
      startBtn: 'Start Voice Conversation',
      stopBtn: 'End Conversation',
      listening: 'Listening to your question...',
      listeningDesc: 'Speak clearly into your microphone. When you stop speaking, ORCA will analyze and answer.',
      processing: 'Analyzing marine data with AI...',
      processingDesc: 'Gathering live Open-Meteo weather, INCOIS ocean data, and safety rules...',
      speaking: 'Speaking response...',
      yourQuestion: 'You asked:',
      orcaResponse: 'ORCA Voice Advisory:',
      viewHistory: 'View Conversation History',
      hideHistory: 'Hide Conversation History',
      historyEmpty: 'No conversation history yet. Start talking to see your records.',
      voiceLangTitle: 'Voice Recognition Language',
      langAutoNotice: 'Language matches your spoken words automatically',
      turnComplete: 'Turn Complete',
      askAnother: 'Ready for your next question...',
      replayVoice: 'Replay Voice',
      turn: 'Turn',
      turns: 'turns',
      historyNotice: 'Conversation ended. History is available below.',
    },
    chat: {
      title: 'ORCA Text Assistant',
      subtitle: 'Ask about weather, sea conditions, fish zones, or maritime regulations',
      inputPlaceholder: 'Type your question in any language (English, Telugu, Hindi)...',
      send: 'Send',
      clear: 'Clear Chat',
      suggestionsTitle: 'Suggested Questions',
      thinking: 'ORCA is thinking...',
      emptyNotice: 'No messages yet. Ask a question or click a suggestion below.',
      suggestions: [
        'Is it safe to fish near Kakinada today?',
        'What are the best fishing zones (PFZ)?',
        'What is the wave height right now?',
        'Should I sail out today?',
        'Which area has high fish activity?',
        'What are today’s hazard warnings?',
      ],
    },
    weatherCard: {
      title: 'Open-Meteo Marine & Hourly Forecast',
      predictions: '24-Hour Weather & Sea Predictions',
      liveApi: 'Live API',
      updated: 'Updated',
      airTemp: 'Air Temp',
      windGusts: 'Wind & Gusts',
      wavesSwell: 'Waves & Swell',
      rainSst: 'Rain & SST',
      gusts: 'Gusts',
      swell: 'Swell',
      sst: 'SST',
      hourlyTimeline: 'Hourly Forecast Timeline (24 Hours)',
      scrollHorizontal: 'Scroll horizontally →',
      fair: 'Fair',
      realtime: 'Realtime',
      forceRefresh: 'Force refresh real-time weather & marine data',
    },
    dashboard: {
      kpiTrips: 'Total Trips',
      kpiCatch: 'Total Catch',
      kpiAvgCatch: 'Avg. Catch / Trip',
      kpiBestZone: 'Best Fishing Zone',
      vsLastWeek: 'vs last week',
      liveSeaConditions: 'Live Sea Conditions',
      seaTempSst: 'Sea Temp (SST)',
      windSpeed: 'Wind Speed',
      waveHeight: 'Wave Height',
      tideLevel: 'Tide Level',
      safetyVerdict: 'Safety Verdict',
      thermalMapTitle: 'Ocean Temperature & Thermal Front Map',
      thermalFront: 'Thermal Front',
      highPotentialZones: 'High Potential Zones',
      viewAllZones: 'View All Zones',
      liveData: 'Live Data',
      fetching: 'Fetching...',
      optimal: 'Optimal',
      marginal: 'Marginal',
      unfavorable: 'Unfavorable',
      tideRising: 'Rising',
      tideFalling: 'Falling',
      seaStateCalm: 'Calm',
      seaStateSlight: 'Slight',
      seaStateModerate: 'Moderate',
      seaStateRough: 'Rough',
    },
    pfz: {
      title: 'Potential Fishing Zones (PFZ)',
      subtitle: 'INCOIS satellite validated chlorophyll and thermal front boundaries.',
      allZones: 'All Zones',
      high: 'High Potential',
      moderate: 'Moderate Potential',
      distance: 'Distance',
      depth: 'Depth',
      species: 'Target Species',
      suitability: 'Suitability',
      viewOnMap: 'View on Map',
      zoneDetails: 'Zone Details',
      recommendation: 'Advisory Recommendation',
    },
    analytics: {
      title: 'Fishing Analytics & History',
      subtitle: 'Track your trip performance, fuel efficiency, and catch records.',
      catchHistory: 'Catch History',
      speciesBreakdown: 'Species Breakdown',
      fuelEfficiency: 'Fuel Efficiency',
      successRate: 'Trip Success Rate',
      tripsOverview: 'Trips Overview',
    },
    settings: {
      title: 'Settings & Preferences',
      profileTitle: 'Fisherman Profile',
      vesselTitle: 'Vessel Information',
      preferences: 'App Preferences',
      notifications: 'Alert Notifications',
      darkMode: 'Dark Mode',
      saveBtn: 'Save Settings',
      captain: 'Captain',
      harbor: 'Home Harbor',
    },
    modals: {
      alertsTitle: 'Marine & Weather Alerts',
      markAllRead: 'Mark all as read',
      supportTitle: '24/7 Coast Guard & Fisherman Support',
      emergencyCall: 'Emergency SOS Call',
      close: 'Close',
      coastGuard: 'Indian Coast Guard Operations',
      supportDesc: 'Instant emergency contact and direct radio channels for offshore assistance.',
    },
    metrics: {
      seaConditions: 'Live Sea Conditions',
      windSpeed: 'Wind Speed',
      waveHeight: 'Wave Height',
      waterTemp: 'Water Temp',
      visibility: 'Visibility',
      safetyVerdict: 'Safety Verdict',
      safeToSail: 'GO - Safe to Sail',
      cautionAdvised: 'CAUTION - Exercise Vigilance',
      dangerStayPort: 'NO-GO - Stay in Harbor',
      knots: 'knots',
      meters: 'm',
      celsius: '°C',
      km: 'km',
    },
    login: {
      title: 'Welcome to ORCA Fishermen',
      signUpTitle: 'Create your ORCA Account',
      subtitle: 'Smart marine intelligence for safer and better fishing.',
      langLabel: 'Choose Your Primary Language',
      usernameLabel: 'Mobile Number / Username',
      passwordLabel: 'Password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot?',
      loginBtn: 'Login',
      signUpBtn: 'Create Account',
      demoLoginBtn: 'Quick Login as Ramesh (Captain, MV Ocean Star)',
      alreadyAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      switchSignUp: 'Sign Up',
      switchLogin: 'Login',
    },
  },
  te: {
    common: {
      appName: 'ఓర్కా మత్స్యకారులు',
      tagline: 'సురక్షితమైన మరియు ఉత్తమమైన చేపల వేట కోసం స్మార్ట్ సముద్ర సమాచారం.',
      loading: 'లోడ్ అవుతోంది...',
      error: 'ఒక లోపం సంభవించింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
      retry: 'మళ్ళీ ప్రయత్నించండి',
      close: 'మూసివేయి',
      save: 'మార్పులను భద్రపరచు',
    },
    nav: {
      home: 'హోమ్',
      dashboard: 'డాష్‌బోర్డ్',
      analytics: 'విశ్లేషణలు',
      pfzAreas: 'PFZ ప్రాంతాలు',
      settings: 'సెట్టింగ్‌లు',
      help: 'సహాయం & మద్దతు',
      logout: 'లాగౌట్',
      emergency: 'SOS అత్యవసర సహాయం',
      activeVessel: 'క్రియాశీల పడవ',
    },
    header: {
      goodMorning: 'శుభోదయం',
      goodAfternoon: 'శుభ మధ్యాహ్నం',
      goodEvening: 'శుభ సాయంత్రం',
      homeSubtitle: 'మీ సురక్షితమైన మరియు లాభదాయకమైన చేపల వేట కోసం మీ స్మార్ట్ సహచరుడు.',
      dashboardTitle: 'డాష్‌బోర్డ్',
      dashboardSubtitle: 'మీ చేపల వేట మరియు సముద్ర పరిస్థితుల పూర్తి అవలోకనం.',
      analyticsTitle: 'విశ్లేషణలు',
      analyticsSubtitle: 'మీ పనితీరు మరియు చేపల వేట గణాంకాలు.',
      pfzTitle: 'PFZ ప్రాంతాలు',
      pfzSubtitle: 'చేపల లభ్యత ప్రాంతాల సమాచారం మరియు అనుకూలత.',
      settingsTitle: 'సెట్టింగ్‌లు',
      settingsSubtitle: 'మీ ప్రొఫైల్ మరియు ప్రాధాన్యతలను నిర్వహించండి.',
      accountSettings: 'ఖాతా సెట్టింగ్‌లు',
      logout: 'లాగౌట్',
      language: 'భాష',
    },
    voice: {
      title: 'వాయిస్ AI సహచరుడు',
      badge: 'లైవ్ వాయిస్ చాట్',
      hint: 'మైక్ నొక్కండి మరియు సహజంగా మాట్లాడండి. మీరు తెలుగులో మాట్లాడితే, ఓర్కా తెలుగులోనే సమాధానం ఇస్తుంది!',
      startBtn: 'వాయిస్ సంభాషణ ప్రారంభించండి',
      stopBtn: 'సంభాషణ ముగించండి',
      listening: 'మీ ప్రశ్న వింటున్నాను...',
      listeningDesc: 'మైక్రోఫోన్‌లో స్పష్టంగా మాట్లాడండి. మీరు మాట్లాడటం ఆపిన వెంటనే సమాధానం వస్తుంది.',
      processing: 'సముద్ర మరియు వాతావరణ సమాచారాన్ని విశ్లేషిస్తోంది...',
      processingDesc: 'వాతావరణం, అలల ఎత్తు మరియు భద్రతా నియమాలను పరిశీలిస్తోంది...',
      speaking: 'సమాధానం చెబుతోంది...',
      yourQuestion: 'మీ ప్రశ్న:',
      orcaResponse: 'ఓర్కా వాయిస్ సమాధానం:',
      viewHistory: 'సంభాషణ చరిత్ర చూడండి',
      hideHistory: 'చరిత్రను దాచండి',
      historyEmpty: 'ఇంకా సంభాషణ చరిత్ర లేదు. మాట్లాడటం ప్రారంభించండి.',
      voiceLangTitle: 'వాయిస్ గుర్తింపు భాష',
      langAutoNotice: 'మీరు మాట్లాడే భాషకు అనుగుణంగా స్వయంచాలకంగా మారుతుంది',
      turnComplete: 'ప్రశ్న పూర్తయింది',
      askAnother: 'మీ తదుపరి ప్రశ్న అడగడానికి సిద్ధం...',
      replayVoice: 'మళ్ళీ వినండి',
      turn: 'విడత',
      turns: 'విడతలు',
      historyNotice: 'సంభాషణ ముగిసింది. మునుపటి ప్రశ్నలు క్రింద చూడవచ్చు.',
    },
    chat: {
      title: 'ఓర్కా టెక్స్ట్ అసిస్టెంట్',
      subtitle: 'వాతావరణం, సముద్ర స్థితి, చేపల జోన్లు లేదా భద్రతా నియమాల గురించి అడగండి',
      inputPlaceholder: 'మీ ప్రశ్నను తెలుగులో లేదా ఇంగ్లీషులో టైప్ చేయండి...',
      send: 'పంపండి',
      clear: 'చాట్ క్లియర్ చేయి',
      suggestionsTitle: 'సూచించిన ప్రశ్నలు',
      thinking: 'ఓర్కా ఆలోచిస్తోంది...',
      emptyNotice: 'ఇంకా సందేశాలు లేవు. ప్రశ్నను అడగండి లేదా క్రింది సూచనను ఎంచుకోండి.',
      suggestions: [
        'ఈరోజు కాకినాడ సమీపంలో వేటకు వెళ్లడం సురక్షితమేనా?',
        'ఉత్తమ చేపల వేట ప్రాంతాలు (PFZ) ఏవి?',
        'ప్రస్తుతం అలల ఎత్తు ఎంత ఉంది?',
        'నేను ఈరోజు సముద్రంలోకి వెళ్లవచ్చా?',
        'ఏ ప్రాంతంలో ఎక్కువ చేపలు లభిస్తాయి?',
        'ఈనాటి ప్రమాద హెచ్చరికలు ఏమిటి?',
      ],
    },
    weatherCard: {
      title: 'ఓపెన్-మెటియో సముద్ర & గంటల సూచన',
      predictions: '24-గంటల వాతావరణ & సముద్ర అంచనాలు',
      liveApi: 'లైవ్ API',
      updated: 'తాజాకరణ',
      airTemp: 'గాలి ఉష్ణోగ్రత',
      windGusts: 'గాలి & ఈదురుగాలులు',
      wavesSwell: 'అలలు & కెరటాలు',
      rainSst: 'వర్షం & సముద్ర ఉష్ణోగ్రత',
      gusts: 'ఈదురుగాలులు',
      swell: 'కెరటం',
      sst: 'సముద్ర ఉష్ణోగ్రత',
      hourlyTimeline: 'గంటల సూచన సమయరేఖ (24 గంటలు)',
      scrollHorizontal: 'పక్కకు జరపండి →',
      fair: 'అనుకూలం',
      realtime: 'రియల్ టైమ్',
      forceRefresh: 'తాజా వాతావరణ & సముద్ర సమాచారాన్ని పొందండి',
    },
    dashboard: {
      kpiTrips: 'మొత్తం ప్రయాణాలు',
      kpiCatch: 'మొత్తం వేట',
      kpiAvgCatch: 'సగటు వేట / ప్రయాణం',
      kpiBestZone: 'ఉత్తమ చేపల వేట ప్రాంతం',
      vsLastWeek: 'గత వారంతో పోలిస్తే',
      liveSeaConditions: 'ప్రత్యక్ష సముద్ర పరిస్థితులు',
      seaTempSst: 'సముద్ర ఉష్ణోగ్రత (SST)',
      windSpeed: 'గాలి వేగం',
      waveHeight: 'అలల ఎత్తు',
      tideLevel: 'పోటు / పాటు స్థాయి',
      safetyVerdict: 'భద్రతా నిర్ణయం',
      thermalMapTitle: 'సముద్ర ఉష్ణోగ్రత & ప్రాంతాల పటం',
      thermalFront: 'థర్మల్ ఫ్రంట్',
      highPotentialZones: 'అధిక చేపల లభ్యత ప్రాంతాలు',
      viewAllZones: 'అన్ని ప్రాంతాలు చూడండి',
      liveData: 'లైవ్ డేటా',
      fetching: 'సేకరిస్తోంది...',
      optimal: 'చాలా అనుకూలం',
      marginal: 'సాధారణం',
      unfavorable: 'ప్రతికూలం',
      tideRising: 'పోటు (పెరుగుతోంది)',
      tideFalling: 'పాటు (తగ్గుతోంది)',
      seaStateCalm: 'ప్రశాంతం',
      seaStateSlight: 'తేలికపాటి',
      seaStateModerate: 'మధ్యస్థం',
      seaStateRough: 'తీవ్రమైన అలలు',
    },
    pfz: {
      title: 'చేపల లభ్యత ప్రాంతాలు (PFZ)',
      subtitle: 'ఇంకోయిస్ మరియు ఉపగ్రహ డేటా ఆధారంగా నిర్ధారించబడిన చేపల లభ్యత జోన్లు.',
      allZones: 'అన్ని ప్రాంతాలు',
      high: 'అధిక లభ్యత',
      moderate: 'మధ్యస్థ లభ్యత',
      distance: 'దూరం',
      depth: 'లోతు',
      species: 'లభించే చేపలు',
      suitability: 'అనుకూలత',
      viewOnMap: 'మ్యాప్‌లో చూడండి',
      zoneDetails: 'ప్రాంతం వివరాలు',
      recommendation: 'సలహా & మార్గదర్శనం',
    },
    analytics: {
      title: 'చేపల వేట విశ్లేషణలు',
      subtitle: 'మీ ప్రయాణాలు, వేట సామర్థ్యం మరియు ఫలితాల సమగ్ర గణాంకాలు.',
      catchHistory: 'చేపల వేట చరిత్ర',
      speciesBreakdown: 'చేపల రకాల వివరాలు',
      fuelEfficiency: 'ఇంధన సామర్థ్యం',
      successRate: 'వేట విజయవంత రేటు',
      tripsOverview: 'ప్రయాణాల సమగ్ర సమాచారం',
    },
    settings: {
      title: 'సెట్టింగ్‌లు & ప్రాధాన్యతలు',
      profileTitle: 'మత్స్యకారుని ప్రొఫైల్',
      vesselTitle: 'పడవ సమాచారం',
      preferences: 'యాప్ ప్రాధాన్యతలు',
      notifications: 'హెచ్చరిక నోటిఫికేషన్లు',
      darkMode: 'డార్క్ మోడ్',
      saveBtn: 'మార్పులను భద్రపరచు',
      captain: 'కెప్టెన్',
      harbor: 'స్థానిక రేవు / పోర్టు',
    },
    modals: {
      alertsTitle: 'సముద్ర & వాతావరణ హెచ్చరికలు',
      markAllRead: 'అన్నీ చదివినట్లు గుర్తించు',
      supportTitle: '24/7 కోస్ట్‌గార్డ్ & మత్స్యకార సహాయం',
      emergencyCall: 'అత్యవసర SOS కాల్',
      close: 'మూసివేయి',
      coastGuard: 'భారతీయ తీర రక్షక దళం (కోస్ట్‌గార్డ్)',
      supportDesc: 'సముద్రంలో అత్యవసర సహాయం కోసం తక్షణ వైర్‌లెస్ మరియు రేడియో ఛానెల్స్.',
    },
    metrics: {
      seaConditions: 'ప్రత్యక్ష సముద్ర పరిస్థితులు',
      windSpeed: 'గాలి వేగం',
      waveHeight: 'అలల ఎత్తు',
      waterTemp: 'నీటి ఉష్ణోగ్రత',
      visibility: 'దూరదృష్టి',
      safetyVerdict: 'భద్రతా నిర్ణయం',
      safeToSail: 'GO - ప్రయాణానికి సురక్షితం',
      cautionAdvised: 'CAUTION - జాగ్రత్త అవసరం',
      dangerStayPort: 'NO-GO - పోర్టులోనే ఉండండి',
      knots: 'నాట్లు',
      meters: 'మీ.',
      celsius: '°C',
      km: 'కి.మీ.',
    },
    login: {
      title: 'ఓర్కా మత్స్యకారులు యాప్‌కు స్వాగతం',
      signUpTitle: 'ఓర్కా ఖాతాను సృష్టించండి',
      subtitle: 'సురక్షితమైన మరియు మెరుగైన చేపల వేట కోసం స్మార్ట్ సముద్ర విశ్లేషణ.',
      langLabel: 'మీ ప్రాథమిక భాషను ఎంచుకోండి',
      usernameLabel: 'మొబైల్ సంఖ్య / యూజర్‌నేమ్',
      passwordLabel: 'పాస్‌వర్డ్',
      rememberMe: 'నన్ను గుర్తుంచుకో',
      forgotPassword: 'మర్చిపోయారా?',
      loginBtn: 'లాగిన్ అవ్వండి',
      signUpBtn: 'ఖాతా సృష్టించండి',
      demoLoginBtn: 'రమేష్‌గా త్వరిత లాగిన్ (కెప్టెన్, MV ఓషన్ స్టార్)',
      alreadyAccount: 'ఖాతా ఇప్పటికే ఉందా?',
      dontHaveAccount: 'ఖాతా లేదా?',
      switchSignUp: 'రిజిస్టర్ చేసుకోండి',
      switchLogin: 'లాగిన్ అవ్వండి',
    },
  },
  hi: {
    common: {
      appName: 'ओर्का मछुआरे',
      tagline: 'सुरक्षित और बेहतर मछली पकड़ने के लिए स्मार्ट समुद्री बुद्धिमत्ता।',
      loading: 'लोड हो रहा है...',
      error: 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
      retry: 'पुनः प्रयास करें',
      close: 'बंद करें',
      save: 'परिवर्तन सहेजें',
    },
    nav: {
      home: 'होम',
      dashboard: 'डैशबोर्ड',
      analytics: 'विश्लेषण',
      pfzAreas: 'PFZ क्षेत्र',
      settings: 'सेटिंग्स',
      help: 'सहायता एवं समर्थन',
      logout: 'लॉगआउट',
      emergency: 'SOS आपातकालीन',
      activeVessel: 'सक्रिय नाव',
    },
    header: {
      goodMorning: 'शुभ प्रभात',
      goodAfternoon: 'शुभ दोपहर',
      goodEvening: 'शुभ संध्या',
      homeSubtitle: 'सुरक्षित और सफल मछली पकड़ने के लिए आपका स्मार्ट साथी।',
      dashboardTitle: 'डैशबोर्ड',
      dashboardSubtitle: 'आपकी मछली पकड़ने की गतिविधियों और समुद्र का विवरण।',
      analyticsTitle: 'विश्लेषण',
      analyticsSubtitle: 'अपने प्रदर्शन और पकड़ी गई मछली के आंकड़े देखें।',
      pfzTitle: 'PFZ क्षेत्र',
      pfzSubtitle: 'मछली पकड़ने के संभावित क्षेत्र और उपयुक्तता।',
      settingsTitle: 'सेटिंग्स',
      settingsSubtitle: 'अपनी प्रोफ़ाइल और प्राथमिकताएँ प्रबंधित करें।',
      accountSettings: 'खाता सेटिंग्स',
      logout: 'लॉगआउट',
      language: 'भाषा',
    },
    voice: {
      title: 'वॉयस AI साथी',
      badge: 'लाइव वॉयस चैट',
      hint: 'माइक दबाएं और स्वाभाविक रूप से बोलें। यदि आप हिंदी में बोलेंगे, तो ओर्का हिंदी में ही उत्तर देगा!',
      startBtn: 'वॉयस बातचीत शुरू करें',
      stopBtn: 'बातचीत समाप्त करें',
      listening: 'आपका प्रश्न सुन रहा हूँ...',
      listeningDesc: 'माइक्रोफ़ोन में स्पष्ट रूप से बोलें। बोलने के बाद ओर्का तुरंत उत्तर देगा।',
      processing: 'समुद्री डेटा का विश्लेषण किया जा रहा है...',
      processingDesc: 'मौसम, लहरों की ऊंचाई और सुरक्षा नियमों की जांच हो रही है...',
      speaking: 'उत्तर दे रहा हूँ...',
      yourQuestion: 'आपने पूछा:',
      orcaResponse: 'ओर्का वॉयस उत्तर:',
      viewHistory: 'बातचीत का इतिहास देखें',
      hideHistory: 'इतिहास छिपाएं',
      historyEmpty: 'अभी तक कोई इतिहास नहीं है। बोलना शुरू करें।',
      voiceLangTitle: 'आवाज पहचान भाषा',
      langAutoNotice: 'बोली गई भाषा के अनुसार स्वतः प्रतिक्रिया देता है',
      turnComplete: 'प्रश्न पूरा हुआ',
      askAnother: 'अगले प्रश्न के लिए तैयार...',
      replayVoice: 'फिर से सुनें',
      turn: 'राउंड',
      turns: 'राउंड्स',
      historyNotice: 'बातचीत समाप्त हो गई है। पिछला इतिहास नीचे उपलब्ध है।',
    },
    chat: {
      title: 'ओर्का टेक्स्ट सहायक',
      subtitle: 'मौसम, समुद्री स्थिति, मछली क्षेत्र या सुरक्षा नियमों के बारे में पूछें',
      inputPlaceholder: 'अपना प्रश्न हिंदी या अंग्रेजी में लिखें...',
      send: 'भेजें',
      clear: 'चैट साफ़ करें',
      suggestionsTitle: 'सुझाए गए प्रश्न',
      thinking: 'ओर्का सोच रहा है...',
      emptyNotice: 'अभी तक कोई संदेश नहीं। नीचे दिए गए किसी सुझाव पर क्लिक करें।',
      suggestions: [
        'क्या आज काकीनाडा के पास मछली पकड़ना सुरक्षित है?',
        'सबसे अच्छे मछली पकड़ने के क्षेत्र (PFZ) कौन से हैं?',
        'वर्तमान में लहरों की ऊंचाई क्या है?',
        'क्या मुझे आज समुद्र में जाना चाहिए?',
        'किस क्षेत्र में मछलियों की अधिक गतिविधि है?',
        'आज की समुद्री चेतावनियाँ क्या हैं?',
      ],
    },
    weatherCard: {
      title: 'ओपन-मेटियो समुद्री एवं प्रति घंटा पूर्वानुमान',
      predictions: '24-घंटे का मौसम एवं समुद्री पूर्वानुमान',
      liveApi: 'लाइव API',
      updated: 'अपडेटेड',
      airTemp: 'हवा का तापमान',
      windGusts: 'हवा एवं झोंके',
      wavesSwell: 'लहरें एवं बहाव',
      rainSst: 'वर्षा एवं समुद्र तापमान',
      gusts: 'झोंके',
      swell: 'बहाव',
      sst: 'SST',
      hourlyTimeline: 'प्रति घंटा पूर्वानुमान समयरेखा (24 घंटे)',
      scrollHorizontal: 'क्षैतिज स्क्रॉल करें →',
      fair: 'सामान्य',
      realtime: 'रीयल-टाइम',
      forceRefresh: 'मौसम एवं समुद्री डेटा ताज़ा करें',
    },
    dashboard: {
      kpiTrips: 'कुल यात्राएं',
      kpiCatch: 'कुल पकड़',
      kpiAvgCatch: 'औसत पकड़ / यात्रा',
      kpiBestZone: 'सर्वश्रेष्ठ मछली क्षेत्र',
      vsLastWeek: 'पिछले सप्ताह की तुलना में',
      liveSeaConditions: 'लाइव समुद्री स्थिति',
      seaTempSst: 'समुद्र तापमान (SST)',
      windSpeed: 'हवा की गति',
      waveHeight: 'लहरों की ऊंचाई',
      tideLevel: 'ज्वार-भाटा स्तर',
      safetyVerdict: 'सुरक्षा निर्णय',
      thermalMapTitle: 'समुद्र तापमान एवं थर्मल फ्रंट मानचित्र',
      thermalFront: 'थर्मल फ्रंट',
      highPotentialZones: 'उच्च संभावना क्षेत्र',
      viewAllZones: 'सभी क्षेत्र देखें',
      liveData: 'लाइव डेटा',
      fetching: 'लोड हो रहा है...',
      optimal: 'उत्तम',
      marginal: 'सामान्य',
      unfavorable: 'प्रतिकूल',
      tideRising: 'चढ़ता ज्वार',
      tideFalling: 'उतरता भाटा',
      seaStateCalm: 'शांत',
      seaStateSlight: 'हल्का',
      seaStateModerate: 'मध्यम',
      seaStateRough: 'खराब',
    },
    pfz: {
      title: 'संभावित मछली पकड़ने के क्षेत्र (PFZ)',
      subtitle: 'INCOIS उपग्रह डेटा द्वारा सत्यापित उच्च मछली क्षेत्र।',
      allZones: 'सभी क्षेत्र',
      high: 'उच्च संभावना',
      moderate: 'मध्यम संभावना',
      distance: 'दूरी',
      depth: 'गहराई',
      species: 'लक्षित प्रजातियाँ',
      suitability: 'उपयुक्तता',
      viewOnMap: 'मानचित्र पर देखें',
      zoneDetails: 'क्षेत्र विवरण',
      recommendation: 'सलाह एवं निर्देश',
    },
    analytics: {
      title: 'मत्स्य पालन विश्लेषण एवं इतिहास',
      subtitle: 'अपने प्रदर्शन, ईंधन दक्षता और पकड़ के आंकड़े ट्रैक करें।',
      catchHistory: 'पकड़ का इतिहास',
      speciesBreakdown: 'प्रजातियों का विवरण',
      fuelEfficiency: 'ईंधन दक्षता',
      successRate: 'सफलता दर',
      tripsOverview: 'यात्राओं का विवरण',
    },
    settings: {
      title: 'सेटिंग्स एवं प्राथमिकताएं',
      profileTitle: 'मछुआरा प्रोफ़ाइल',
      vesselTitle: 'नाव की जानकारी',
      preferences: 'ऐप प्राथमिकताएं',
      notifications: 'चेतावनी सूचनाएं',
      darkMode: 'डार्क मोड',
      saveBtn: 'सेव करें',
      captain: 'कप्तान',
      harbor: 'गृह बंदरगाह',
    },
    modals: {
      alertsTitle: 'समुद्री एवं मौसम चेतावनियाँ',
      markAllRead: 'सभी को पढ़ा हुआ चिह्नित करें',
      supportTitle: '24/7 तटरक्षक एवं मछुआरा सहायता',
      emergencyCall: 'आपातकालीन SOS कॉल',
      close: 'बंद करें',
      coastGuard: 'भारतीय तटरक्षक बल (Coast Guard)',
      supportDesc: 'समुद्र में आपातकालीन सहायता और सीधे रेडियो चैनल।',
    },
    metrics: {
      seaConditions: 'लाइव समुद्री स्थिति',
      windSpeed: 'हवा की गति',
      waveHeight: 'लहरों की ऊंचाई',
      waterTemp: 'पानी का तापमान',
      visibility: 'दृश्यता',
      safetyVerdict: 'सुरक्षा निर्णय',
      safeToSail: 'जा सकते हैं (सुरक्षित)',
      cautionAdvised: 'सतर्कता आवश्यक है',
      dangerStayPort: 'खतरा - बंदरगाह में ही रहें',
      knots: 'नॉट्स',
      meters: 'मीटर',
      celsius: '°C',
      km: 'किमी',
    },
    login: {
      title: 'ओर्का मछुआरे में आपका स्वागत है',
      signUpTitle: 'नया खाता बनाएं',
      subtitle: 'सुरक्षित और बेहतर मछली पकड़ने के लिए स्मार्ट समुद्री बुद्धिमत्ता।',
      langLabel: 'अपनी प्राथमिक भाषा चुनें',
      usernameLabel: 'मोबाइल नंबर / यूज़रनेम',
      passwordLabel: 'पासवर्ड',
      rememberMe: 'मुझे याद रखें',
      forgotPassword: 'भूल गए?',
      loginBtn: 'लॉग इन करें',
      signUpBtn: 'खाता बनाएं',
      demoLoginBtn: 'रमेश के रूप में त्वरित लॉगिन (कप्तान, MV ओशन स्टार)',
      alreadyAccount: 'क्या आपके पास पहले से खाता है?',
      dontHaveAccount: 'खाता नहीं है?',
      switchSignUp: 'साइन अप करें',
      switchLogin: 'लॉग इन करें',
    },
  },
  ta: {
    common: {
      appName: 'ஆர்கா மீனவர்கள்',
      tagline: 'பாதுகாப்பான மற்றும் சிறந்த மீன்பிடித்தலுக்கான ஸ்மார்ட் கடல்சார் நுண்ணறிவு.',
      loading: 'ஏற்றுகிறது...',
      error: 'பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
      retry: 'மீண்டும் முயற்சிக்கவும்',
      close: 'மூடு',
      save: 'மாற்றங்களை சேமிக்கவும்',
    },
    nav: {
      home: 'முகப்பு',
      dashboard: 'டாஷ்போர்டு',
      analytics: 'பகுப்பாய்வு',
      pfzAreas: 'PFZ பகுதிகள்',
      settings: 'அமைப்புகள்',
      help: 'உதவி & ஆதரவு',
      logout: 'வெளியேறு',
      emergency: 'SOS அவசர உதவி',
      activeVessel: 'செயலில் உள்ள படகு',
    },
    header: {
      goodMorning: 'காலை வணக்கம்',
      goodAfternoon: 'மதிய வணக்கம்',
      goodEvening: 'மாலை வணக்கம்',
      homeSubtitle: 'பாதுகாப்பான மற்றும் வெற்றிகரமான மீன்பிடித்தலுக்கான உங்கள் ஸ்மார்ட் துணை.',
      dashboardTitle: 'டாஷ்போர்டு',
      dashboardSubtitle: 'உங்கள் மீன்பிடி நடவடிக்கைகள் மற்றும் கடல் நிலவரங்களின் கண்ணோட்டம்.',
      analyticsTitle: 'பகுப்பாய்வு',
      analyticsSubtitle: 'உங்கள் செயல்திறன் மற்றும் மீன் பிடிப்பு நுண்ணறிவுகளைக் கண்காணிக்கவும்.',
      pfzTitle: 'PFZ பகுதிகள்',
      pfzSubtitle: 'சாத்தியமான மீன்பிடி மண்டல தகவல் மற்றும் பொருத்தம்.',
      settingsTitle: 'அமைப்புகள்',
      settingsSubtitle: 'உங்கள் சுயவிவரம் மற்றும் அமைப்புகளை நிர்வகிக்கவும்.',
      accountSettings: 'கணக்கு அமைப்புகள்',
      logout: 'வெளியேறு',
      language: 'மொழி',
    },
    voice: {
      title: 'குரல் AI துணை',
      badge: 'நேரலை குரல் அரட்டை',
      hint: 'மைக்கை தட்டி இயல்பாக பேசுங்கள். நீங்கள் தமிழில் பேசினால், ஆர்கா தமிழிலேயே பதிலளிக்கும்!',
      startBtn: 'குரல் உரையாடலைத் தொடங்குங்கள்',
      stopBtn: 'உரையாடலை முடிக்கவும்',
      listening: 'உங்கள் கேள்வியைக் கேட்கிறேன்...',
      listeningDesc: 'மைக்கில் தெளிவாகப் பேசுங்கள். நீங்கள் பேசி முடித்ததும் ஆர்கா பகுப்பாய்வு செய்து பதிலளிக்கும்.',
      processing: 'கடல்சார் தரவுகளை பகுப்பாய்வு செய்கிறது...',
      processingDesc: 'வானிலை, அலை உயரம் மற்றும் பாதுகாப்பு விதிகளை சரிபார்க்கிறது...',
      speaking: 'பதிலளிக்கிறது...',
      yourQuestion: 'நீங்கள் கேட்டது:',
      orcaResponse: 'ஆர்கா குரல் ஆலோசனை:',
      viewHistory: 'உரையாடல் வரலாற்றைக் காண்க',
      hideHistory: 'வரலாற்றை மறை',
      historyEmpty: 'வரலாறு எதுவும் இல்லை. பேசத் தொடங்குங்கள்.',
      voiceLangTitle: 'குரல் அறிதல் மொழி',
      langAutoNotice: 'பேசும் மொழிக்கு ஏற்ப தானாக மாறும்',
      turnComplete: 'கேள்வி முடிந்தது',
      askAnother: 'அடுத்த கேள்விக்குத் தயார்...',
      replayVoice: 'மீண்டும் கேட்கவும்',
      turn: 'சுற்று',
      turns: 'சுற்றுகள்',
      historyNotice: 'உரையாடல் முடிந்தது. முந்தைய வரலாறு கீழே உள்ளது.',
    },
    chat: {
      title: 'ஆர்கா உரை உதவியாளர்',
      subtitle: 'வானிலை, கடல் நிலை, மீன் மண்டலங்கள் அல்லது கடல்சார் விதிகள் பற்றி கேளுங்கள்',
      inputPlaceholder: 'உங்கள் கேள்வியை தமிழ் அல்லது ஆங்கிலத்தில் தட்டச்சு செய்யவும்...',
      send: 'அனுப்பு',
      clear: 'அரட்டையை அழி',
      suggestionsTitle: 'பரிந்துரைக்கப்பட்ட கேள்விகள்',
      thinking: 'ஆர்கா சிந்திக்கிறது...',
      emptyNotice: 'செய்திகள் இல்லை. ஒரு கேள்வியைக் கேளுங்கள் அல்லது கீழே உள்ளதை தேர்வு செய்யுங்கள்.',
      suggestions: [
        'இன்று காக்கிநாடா அருகே மீன்பிடிப்பது பாதுகாப்பானதா?',
        'சிறந்த மீன்பிடி மண்டலங்கள் (PFZ) யாவை?',
        'தற்போதைய அலை உயரம் என்ன?',
        'நான் இன்று கடலுக்குச் செல்லலாமா?',
        'எந்தப் பகுதியில் மீன் நடமாட்டம் அதிகம்?',
        'இன்றைய கடல் எச்சரிக்கைகள் என்ன?',
      ],
    },
    weatherCard: {
      title: 'ஓபன்-மெட்டியோ கடல் & மணிநேர முன்னறிவிப்பு',
      predictions: '24-மணிநேர வானிலை & கடல் கணிப்புகள்',
      liveApi: 'லைவ் API',
      updated: 'புதுப்பிக்கப்பட்டது',
      airTemp: 'காற்று வெப்பநிலை',
      windGusts: 'காற்று & பலத்த காற்று',
      wavesSwell: 'அலைகள் & நீரோட்டம்',
      rainSst: 'மழை & கடல் வெப்பநிலை',
      gusts: 'பலத்த காற்று',
      swell: 'நீரோட்டம்',
      sst: 'SST',
      hourlyTimeline: 'மணிநேர முன்னறிவிப்பு காலவரிசை (24 மணிநேரம்)',
      scrollHorizontal: 'கிடைமட்டமாக உருட்டவும் →',
      fair: 'சீரானது',
      realtime: 'நிகழ்நேரம்',
      forceRefresh: 'வானிலை & கடல் தரவை புதுப்பிக்கவும்',
    },
    dashboard: {
      kpiTrips: 'மொத்த பயணங்கள்',
      kpiCatch: 'மொத்த பிடிப்பு',
      kpiAvgCatch: 'சராசரி பிடிப்பு / பயணம்',
      kpiBestZone: 'சிறந்த மீன்பிடி மண்டலம்',
      vsLastWeek: 'கடந்த வாரத்துடன் ஒப்பிடுகையில்',
      liveSeaConditions: 'நேரலை கடல் நிலை',
      seaTempSst: 'கடல் வெப்பநிலை (SST)',
      windSpeed: 'காற்றின் வேகம்',
      waveHeight: 'அலை உயரம்',
      tideLevel: 'அலை நிலை',
      safetyVerdict: 'பாதுகாப்பு தீர்ப்பு',
      thermalMapTitle: 'கடல் வெப்பநிலை & மண்டல வரைபடம்',
      thermalFront: 'வெப்பநிலை முன்னணி',
      highPotentialZones: 'அதிக சாத்தியமுள்ள பகுதிகள்',
      viewAllZones: 'அனைத்து மண்டலங்களையும் காண்க',
      liveData: 'லைவ் தரவு',
      fetching: 'ஏற்றுகிறது...',
      optimal: 'மிகவும் சிறந்தது',
      marginal: 'சராசரி',
      unfavorable: 'சாதகமற்றது',
      tideRising: 'ஏறும் அலை',
      tideFalling: 'இறங்கும் அலை',
      seaStateCalm: 'அமைதியானது',
      seaStateSlight: 'லேசானது',
      seaStateModerate: 'மிதமானது',
      seaStateRough: 'கொந்தளிப்பானது',
    },
    pfz: {
      title: 'சாத்தியமான மீன்பிடி மண்டலங்கள் (PFZ)',
      subtitle: 'INCOIS செயற்கைக்கோள் தரவு மூலம் உறுதிப்படுத்தப்பட்ட பகுதிகள்.',
      allZones: 'அனைத்து மண்டலங்கள்',
      high: 'அதிக சாத்தியம்',
      moderate: 'மிதமான சாத்தியம்',
      distance: 'தூரம்',
      depth: 'ஆழம்',
      species: 'இலக்கு மீன் வகைகள்',
      suitability: 'பொருத்தம்',
      viewOnMap: 'வரைபடத்தில் காண்க',
      zoneDetails: 'மண்டல விவரங்கள்',
      recommendation: 'ஆலோசனை பரிந்துரை',
    },
    analytics: {
      title: 'மீன்பிடி பகுப்பாய்வு & வரலாறு',
      subtitle: 'உங்கள் பயண செயல்திறன், எரிபொருள் திறன் மற்றும் பிடிப்பு பதிவுகளைக் கண்காணிக்கவும்.',
      catchHistory: 'பிடிப்பு வரலாறு',
      speciesBreakdown: 'மீன் வகைகள் விவரம்',
      fuelEfficiency: 'எரிபொருள் திறன்',
      successRate: 'வெற்றி விகிதம்',
      tripsOverview: 'பயணங்கள் கண்ணோட்டம்',
    },
    settings: {
      title: 'அமைப்புகள் & விருப்பத்தேர்வுகள்',
      profileTitle: 'மீனவர் சுயவிவரம்',
      vesselTitle: 'படகு தகவல்',
      preferences: 'பயன்பாட்டு விருப்பங்கள்',
      notifications: 'எச்சரிக்கை அறிவிப்புகள்',
      darkMode: 'டார்க் மோட்',
      saveBtn: 'சேமிக்கவும்',
      captain: 'கேப்டன்',
      harbor: 'துறைமுகம்',
    },
    modals: {
      alertsTitle: 'கடல் & வானிலை எச்சரிக்கைகள்',
      markAllRead: 'அனைத்தையும் படித்ததாகக் குறிக்கவும்',
      supportTitle: '24/7 கடலோர காவல்படை & மீனவர் உதவி',
      emergencyCall: 'அவசர SOS அழைப்பு',
      close: 'மூடு',
      coastGuard: 'இந்திய கடலோர காவல்படை',
      supportDesc: 'கடலில் அவசர உதவிக்கான உடனடி ரேடியோ சேனல்கள்.',
    },
    metrics: {
      seaConditions: 'நேரலை கடல் நிலை',
      windSpeed: 'காற்றின் வேகம்',
      waveHeight: 'அலை உயரம்',
      waterTemp: 'நீர் வெப்பநிலை',
      visibility: 'பார்வை தூரம்',
      safetyVerdict: 'பாதுகாப்பு தீர்ப்பு',
      safeToSail: 'செல்லலாம் (பாதுகாப்பானது)',
      cautionAdvised: 'எச்சரிக்கையுடன் செல்லவும்',
      dangerStayPort: 'ஆபத்து - துறைமுகத்தில் இருங்கள்',
      knots: 'நாட்ஸ்',
      meters: 'மீட்டர்',
      celsius: '°C',
      km: 'கி.மீ',
    },
    login: {
      title: 'ஆர்கா மீனவர்கள் உங்களை வரவேற்கிறது',
      signUpTitle: 'புதிய கணக்கை உருவாக்கவும்',
      subtitle: 'பாதுகாப்பான மற்றும் சிறந்த மீன்பிடித்தலுக்கான ஸ்மார்ட் கடல்சார் நுண்ணறிவு.',
      langLabel: 'உங்கள் முதன்மை மொழியைத் தேர்ந்தெடுக்கவும்',
      usernameLabel: 'மொபைல் எண் / பயனர்பெயர்',
      passwordLabel: 'கடவுச்சொல்',
      rememberMe: 'என்னை நினைவில் கொள்',
      forgotPassword: 'மறந்துவிட்டதா?',
      loginBtn: 'உள்நுழையவும்',
      signUpBtn: 'கணக்கை உருவாக்கவும்',
      demoLoginBtn: 'ரமேஷாக விரைவு உள்நுழைவு (கேப்டன், MV ஓஷன் ஸ்டார்)',
      alreadyAccount: 'ஏற்கனவே கணக்கு உள்ளதா?',
      dontHaveAccount: 'கணக்கு இல்லையா?',
      switchSignUp: 'பதிவு செய்க',
      switchLogin: 'உள்நுழையவும்',
    },
  },
};
