import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Send,
  Sparkles,
  Sun,
  ShieldCheck,
  Cloud,
  Navigation,
  Globe,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { getBotReply } from '../data/mockData';

export const HomeScreen: React.FC = () => {
  // Voice Bot state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceReply, setVoiceReply] = useState<string | null>(null);

  // Chat Bot state
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    'Where is the best fishing zone today?',
    'Is the sea safe?',
    'What is the weather?',
    'Should I go fishing now?',
    'Which area has high fish productivity?',
    "What are today's risks?",
  ];

  // Voice Bot Tap to Speak handler
  const handleToggleVoice = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setVoiceTranscript('Listening to your query...');
    setVoiceReply(null);

    // Simulate recognizing voice query after 2.5s
    setTimeout(() => {
      setIsListening(false);
      const recognized = 'Where is the best fishing zone today?';
      setVoiceTranscript(recognized);
      const reply = getBotReply(recognized);
      setVoiceReply(reply);
      setIsSpeaking(true);

      // Add to chat history too
      const userMsg: ChatMessage = {
        id: `voice-${Date.now()}`,
        sender: 'user',
        text: recognized,
        timestamp: 'Just now',
      };
      const botMsg: ChatMessage = {
        id: `voice-reply-${Date.now()}`,
        sender: 'orca',
        text: reply,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, userMsg, botMsg]);

      // Web Speech synthesis if available
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(reply);
        utter.rate = 1.0;
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        try {
          window.speechSynthesis.speak(utter);
        } catch {
          setIsSpeaking(false);
        }
      } else {
        setTimeout(() => setIsSpeaking(false), 3500);
      }
    }, 2400);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText('');

    // Answer after realistic slight delay
    setTimeout(() => {
      const replyText = getBotReply(text);
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'orca',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 600);
  };

  useEffect(() => {
    if (messages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="space-y-6 pb-12" data-purpose="cards-content">
      {/* 1. Voice Bot Card */}
      <section
        className="bg-white rounded-[22px] border border-[#e5ecf4] p-6 sm:p-7 shadow-xs relative overflow-hidden"
        data-purpose="voice-bot-section"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[17px] font-bold text-[#0b2545]">Voice Bot</h2>
          {isSpeaking && (
            <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full animate-pulse">
              <Volume2 className="w-3.5 h-3.5" />
              Speaking response...
            </span>
          )}
        </div>

        <div className="py-5 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-6 sm:gap-12 w-full max-w-[620px]">
            {/* Left Audio Waveform */}
            <div
              aria-hidden="true"
              className="flex items-center gap-1 sm:gap-1.5 h-14"
            >
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-7 animate-pulse' : 'h-3'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-10 animate-pulse delay-75' : 'h-5'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-14 animate-pulse delay-150' : 'h-9'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-12 animate-pulse delay-100' : 'h-14'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-9 animate-pulse delay-200' : 'h-10'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-6 animate-pulse delay-75' : 'h-6'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-4 animate-pulse' : 'h-4'
                }`}
              />
            </div>

            {/* Central Concentric Mic Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              aria-label="Tap to speak"
              className="relative group focus:outline-none flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            >
              {/* Outer light concentric halo ring */}
              <div
                className={`w-[115px] h-[115px] sm:w-[124px] sm:h-[124px] rounded-full flex items-center justify-center transition-all duration-300 ${
                  isListening
                    ? 'bg-blue-100 ring-4 ring-blue-300 scale-105 animate-pulse'
                    : 'bg-[#e3eefd] group-hover:scale-105'
                }`}
              >
                {/* Middle ring */}
                <div className="w-[90px] h-[90px] sm:w-[98px] sm:h-[98px] rounded-full bg-[#c9dffc] flex items-center justify-center">
                  {/* Inner solid blue button */}
                  <div
                    className={`w-[70px] h-[70px] sm:w-[74px] sm:h-[74px] rounded-full text-white flex items-center justify-center shadow-md shadow-blue-500/25 transition-colors ${
                      isListening ? 'bg-red-500' : 'bg-[#0d6efd]'
                    }`}
                  >
                    <Mic className="w-8 h-8 text-white stroke-[2]" />
                  </div>
                </div>
              </div>
            </button>

            {/* Right Audio Waveform */}
            <div
              aria-hidden="true"
              className="flex items-center gap-1 sm:gap-1.5 h-14"
            >
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-6 animate-pulse' : 'h-4'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-11 animate-pulse delay-100' : 'h-7'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-14 animate-pulse delay-75' : 'h-11'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-13 animate-pulse delay-150' : 'h-14'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-8 animate-pulse delay-200' : 'h-9'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-6 animate-pulse delay-100' : 'h-6'
                }`}
              />
              <span
                className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                  isListening || isSpeaking ? 'h-3 animate-pulse' : 'h-3'
                }`}
              />
            </div>
          </div>

          {/* Voice Bot Prompts */}
          <div className="text-center mt-3">
            <p className="text-[17px] font-bold text-[#0d6efd]">
              {isListening ? 'Listening...' : isSpeaking ? 'Answering your query' : 'Tap to speak'}
            </p>
            <p className="text-[13px] text-[#64748b] font-medium max-w-sm mt-1 leading-tight">
              {voiceTranscript
                ? `"${voiceTranscript}"`
                : "I'm here to help you with fishing, weather, safety and more."}
            </p>
          </div>

          {/* Voice Reply Transcript Box */}
          {voiceReply && (
            <div className="mt-4 p-3.5 bg-blue-50/80 border border-blue-200/70 rounded-xl max-w-xl text-xs text-[#0b2545] font-medium leading-relaxed shadow-2xs">
              <span className="font-bold text-[#0d6efd] block mb-0.5">ORCA Voice Assistant:</span>
              {voiceReply}
            </div>
          )}
        </div>
      </section>

      {/* 2. Chat Bot Card */}
      <section
        className="bg-white rounded-[22px] border border-[#e5ecf4] p-6 sm:p-7 shadow-xs space-y-4"
        data-purpose="chat-bot-section"
      >
        <h2 className="text-[17px] font-bold text-[#0b2545]">Chat Bot</h2>

        {/* Suggestion Chips Section */}
        <div className="space-y-2.5">
          <span className="block text-[13px] font-semibold text-[#0b2545]">Conversation</span>
          <div className="flex flex-wrap items-center gap-2">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="px-3.5 py-1.5 text-[12px] font-medium text-[#0b2545] bg-white border border-[#d2deeb] rounded-full hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all cursor-pointer shadow-2xs active:scale-95 text-left"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Thread or Empty Prompt Guide Container */}
        {messages.length === 0 ? (
          <div className="border border-[#e1eaf3] rounded-2xl py-8 px-6 flex flex-col items-center justify-center text-center bg-white shadow-2xs">
            <div className="text-[#0d6efd] mb-2.5">
              <Sparkles className="w-6 h-6 fill-current" />
            </div>
            <h3 className="text-[13.5px] font-bold text-[#0b2545]">
              Ask about fishing zones, sea safety, weather, SST or risks.
            </h3>
            <p className="text-[12px] text-[#64748b] font-medium mt-1">
              ORCA remembers your role, region, page and previous messages.
            </p>
          </div>
        ) : (
          <div className="border border-[#e1eaf3] rounded-2xl p-4 sm:p-5 max-h-[340px] overflow-y-auto space-y-3.5 bg-slate-50/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#0d6efd] text-white rounded-br-xs shadow-xs'
                      : 'bg-white border border-[#e2ecf6] text-[#0b2545] rounded-bl-xs shadow-2xs'
                  }`}
                >
                  <p className="font-normal">{msg.text}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
        )}

        {/* Input & Send Action Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3 pt-1"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about India..."
              className="w-full bg-white border border-[#d5e0ec] rounded-xl px-4 py-2.5 text-[13.5px] placeholder-[#8c9bb0] text-[#0b2545] focus:outline-none focus:border-[#0d6efd] focus:ring-1 focus:ring-[#0d6efd] shadow-2xs"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0d6efd] hover:bg-[#0b5ed7] text-white px-5 py-2.5 rounded-xl font-bold text-[13.5px] flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-sm shadow-blue-500/20 active:scale-95"
          >
            <Send className="w-4 h-4 fill-current -rotate-45 -translate-y-0.5" />
            <span>Send</span>
          </button>
        </form>
      </section>

      {/* 3. Evaluation Criteria Card */}
      <section
        className="bg-white rounded-[22px] border border-[#e5ecf4] p-6 sm:p-7 shadow-xs"
        data-purpose="evaluation-criteria-section"
      >
        <h2 className="text-[16px] font-bold text-[#0d6efd] mb-4">Evaluation Criteria</h2>

        {/* Two Column Criteria Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
          {/* Item 1: Sea Conditions */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <Sun className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">Sea Conditions</p>
              <p className="text-[12px] text-[#64748b] font-medium leading-tight mt-0.5">
                Good for fishing
              </p>
            </div>
          </div>

          {/* Item 2: Safety */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">Safety</p>
              <p className="text-[12px] text-[#64748b] font-medium leading-tight mt-0.5">Safe</p>
            </div>
          </div>

          {/* Item 3: Weather Stability */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <Cloud className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">
                Weather Stability
              </p>
              <p className="text-[12px] text-[#64748b] font-medium leading-tight mt-0.5">Low risk</p>
            </div>
          </div>

          {/* Item 4: Accessibility */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <Navigation className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">Accessibility</p>
              <p className="text-[12px] text-[#64748b] font-medium leading-tight mt-0.5">
                Easy to reach
              </p>
            </div>
          </div>

          {/* Item 5: Fishing Activity */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">
                Fishing Activity
              </p>
              <p className="text-[12px] text-[#64748b] font-medium leading-tight mt-0.5">High</p>
            </div>
          </div>

          {/* Item 6: Overall Rating */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 stroke-[1.9] fill-[#16a34a]/20" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">Overall Rating</p>
              <p className="text-[12px] text-[#16a34a] font-bold leading-tight mt-0.5">Excellent</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
