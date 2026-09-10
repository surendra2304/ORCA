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
    metrics: {
      seaConditions: 'Live Sea Conditions (Kakinada Coast)',
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
    },
    chat: {
      title: 'ఓర్కా టెక్స్ట్ అసిస్టెంట్',
      subtitle: 'వాతావరణం, సముద్ర స్థితి, చేపల జోన్లు లేదా భద్రతా నియమాల గురించి అడగండి',
      inputPlaceholder: 'మీ ప్రశ్నను తెలుగులో లేదా ఇంగ్లీషులో టైప్ చేయండి...',
      send: 'పంపు',
      clear: 'చాట్ తొలగించు',
      suggestionsTitle: 'సూచించిన ప్రశ్నలు',
      thinking: 'ఓర్కా ఆలోచిస్తోంది...',
      emptyNotice: 'ఇంకా సందేశాలు లేవు. ప్రశ్న అడగండి లేదా క్రింది సూచనపై క్లిక్ చేయండి.',
      suggestions: [
        'ఈరోజు కాకినాడ సమీపంలో వేటకు వెళ్లడం సురక్షితమేనా?',
        'ఉత్తమ చేపల వేట ప్రాంతాలు (PFZ) ఏవి?',
        'ప్రస్తుతం అలల ఎత్తు ఎంత ఉంది?',
        'నేను ఈరోజు సముద్రంలోకి వెళ్లవచ్చా?',
        'ఏ ప్రాంతంలో ఎక్కువ చేపలు లభిస్తాయి?',
        'ఈనాటి ప్రమాద హెచ్చరికలు ఏమిటి?',
      ],
    },
    metrics: {
      seaConditions: 'ప్రత్యక్ష సముద్ర పరిస్థితులు (కాకినాడ తీరం)',
      windSpeed: 'గాలి వేగం',
      waveHeight: 'అలల ఎత్తు',
      waterTemp: 'నీటి ఉష్ణోగ్రత',
      visibility: 'దృశ్యమానత',
      safetyVerdict: 'భద్రతా నిర్ణయం',
      safeToSail: 'వెళ్ళవచ్చు (సురక్షితం)',
      cautionAdvised: 'జాగ్రత్త వహించండి',
      dangerStayPort: 'ప్రమాదం - తీరంలోనే ఉండండి',
      knots: 'నాట్స్',
      meters: 'మీటర్లు',
      celsius: '°సెంటీగ్రేడ్',
      km: 'కి.మీ',
    },
    login: {
      title: 'ఓర్కా మత్స్యకారుల వ్యవస్థకు స్వాగతం',
      signUpTitle: 'కొత్త ఖాతాను సృష్టించండి',
      subtitle: 'సురక్షితమైన మరియు లాభదాయకమైన వేట కోసం స్మార్ట్ సముద్ర సమాచారం.',
      langLabel: 'మీ ప్రాథమిక భాషను ఎంచుకోండి',
      usernameLabel: 'మొబైల్ నంబర్ / యూజర్‌నేమ్',
      passwordLabel: 'పాస్‌వర్డ్',
      rememberMe: 'నన్ను గుర్తుంచుకో',
      forgotPassword: 'మర్చిపోయారా?',
      loginBtn: 'లాగిన్ అవ్వండి',
      signUpBtn: 'ఖాతా సృష్టించండి',
      demoLoginBtn: 'రమేష్‌గా త్వరిత లాగిన్ (కెప్టెన్, MV ఓషన్ స్టార్)',
      alreadyAccount: 'ఇప్పటికే ఖాతా ఉందా?',
      dontHaveAccount: 'ఖాతా లేదా?',
      switchSignUp: 'సైన్ అప్',
      switchLogin: 'లాగిన్',
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
      help: 'सहायता व समर्थन',
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
    metrics: {
      seaConditions: 'लाइव समुद्री स्थिति (काकीनाडा तट)',
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
      homeSubtitle: 'பாதுகாப்பான மற்றும் வெற்றிகரமான மீன்பிடித்தலுக்கான உங்கள் தோழன்.',
      dashboardTitle: 'டாஷ்போர்டு',
      dashboardSubtitle: 'உங்கள் மீன்பிடி நடவடிக்கைகள் மற்றும் கடல் நிலவரங்களின் கண்ணோட்டம்.',
      analyticsTitle: 'பகுப்பாய்வு',
      analyticsSubtitle: 'உங்கள் மீன்பிடி புள்ளிவிவரங்களைக் கண்காணிக்கவும்.',
      pfzTitle: 'PFZ பகுதிகள்',
      pfzSubtitle: 'மீன் கிடைக்கும் பகுதிகள் பற்றிய தகவல் மற்றும் பொருத்தம்.',
      settingsTitle: 'அமைப்புகள்',
      settingsSubtitle: 'உங்கள் சுயவிவரம் மற்றும் விருப்பங்களை நிர்வகிக்கவும்.',
      accountSettings: 'கணக்கு அமைப்புகள்',
      logout: 'வெளியேறு',
      language: 'மொழி',
    },
    voice: {
      title: 'குரல் AI வழிகாட்டி',
      badge: 'நேரலை குரல் அரட்டை',
      hint: 'மைக்கை அழுத்தி இயல்பாகப் பேசுங்கள். நீங்கள் தமிழில் பேசினால், ஆர்கா தமிழிலேயே பதிலளிக்கும்!',
      startBtn: 'குரல் உரையாடலைத் தொடங்குங்கள்',
      stopBtn: 'உரையாடலை முடிக்கவும்',
      listening: 'உங்கள் கேள்வியைக் கேட்கிறேன்...',
      listeningDesc: 'மைக்கில் தெளிவாகப் பேசுங்கள். நீங்கள் பேசி முடித்ததும் ஆர்கா பதிலளிக்கும்.',
      processing: 'கடல் மற்றும் வானிலை தரவை பகுப்பாய்வு செய்கிறது...',
      processingDesc: 'வானிலை, அலை உயரம் மற்றும் பாதுகாப்பு விதிகளை சரிபார்க்கிறது...',
      speaking: 'பதிலளிக்கிறது...',
      yourQuestion: 'நீங்கள் கேட்டது:',
      orcaResponse: 'ஆர்கா குரல் பதில்:',
      viewHistory: 'உரையாடல் வரலாற்றைப் பார்க்கவும்',
      hideHistory: 'வரலாற்றை மறைக்கவும்',
      historyEmpty: 'இன்னும் உரையாடல் வரலாறு இல்லை. பேசத் தொடங்குங்கள்.',
      voiceLangTitle: 'குரல் அறிதல் மொழி',
      langAutoNotice: 'நீங்கள் பேசும் மொழிக்கு ஏற்ப தானாகவே பதிலளிக்கும்',
      turnComplete: 'கேள்வி முடிந்தது',
      askAnother: 'அடுத்த கேள்விக்குத் தயார்...',
    },
    chat: {
      title: 'ஆர்கா உரை உதவியாளர்',
      subtitle: 'வானிலை, கடல் நிலை, மீன்பிடி மண்டலங்கள் பற்றி கேளுங்கள்',
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
    metrics: {
      seaConditions: 'நேரலை கடல் நிலை (காக்கிநாடா கடற்கரை)',
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
