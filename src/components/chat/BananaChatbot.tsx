import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageCircle,
  X,
  Send,
  RotateCcw,
  ArrowRight,
  ChevronRight,
  User,
  Bot,
  BookOpen,
  Leaf,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  getBotResponse,
  ChatMessage,
  QUICK_PILLARS,
  QuickPillarOption,
} from "@/lib/chatbot-knowledge";

const BananaChatbot = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Purely Stateless: รีเฟรชหน้าจอแล้วเริ่มต้นใหม่เสมอ ไม่มีการเก็บ Session ค้าง
  const initialWelcomeMessage: ChatMessage = {
    id: "welcome-msg",
    sender: "bot",
    text: `เริ่มต้นการสนทนาใหม่แล้วครับ
เลือกหัวข้อด่วนเพื่อดูข้อมูล หรือพิมพ์คำถามที่ต้องการได้เลยครับ:`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    showQuickPillars: true,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isTyping]);

  // ซ่อน Chat Widget ในหน้า Auth / Login / Reset Password
  const isAuthPage =
    location.pathname.startsWith("/auth") || location.pathname === "/reset-password";
  if (isAuthPage) {
    return null;
  }

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // หน่วงเวลาจำลองการประมวลผล 400ms
    setTimeout(() => {
      const botReply = getBotResponse(query);
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: botReply.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionUrl: botReply.actionUrl,
        actionLabel: botReply.actionLabel,
        showQuickPillars: botReply.showQuickPillars,
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "bot",
        text: `เริ่มต้นการสนทนาใหม่แล้วครับ
เลือกหัวข้อด่วนเพื่อดูข้อมูล หรือพิมพ์คำถามที่ต้องการได้เลยครับ:`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        showQuickPillars: true,
      },
    ]);
  };

  const handleActionClick = (url: string) => {
    navigate(url);
    if (window.innerWidth < 640) {
      setIsOpen(false);
    }
  };

  // Helper to render bold markdown in text smoothly
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={lIdx} className="block leading-relaxed">
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={pIdx} className="font-semibold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </span>
      );
    });
  };

  const renderIcon = (type: QuickPillarOption["iconType"]) => {
    switch (type) {
      case "guide":
        return <BookOpen className="w-3.5 h-3.5 text-amber-700" />;
      case "knowledge":
        return <Leaf className="w-3.5 h-3.5 text-emerald-700" />;
      case "farm":
        return <Store className="w-3.5 h-3.5 text-orange-700" />;
    }
  };

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 flex flex-col items-end">
      {/* 🟢 Chat Window */}
      {isOpen && (
        <Card className="w-[calc(100vw-24px)] sm:w-[400px] md:w-[420px] h-[580px] max-h-[calc(100dvh-80px)] flex flex-col mb-2.5 shadow-2xl rounded-2xl sm:rounded-3xl border border-amber-200/80 bg-white/95 backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-3 flex items-center justify-between shadow-sm select-none shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base leading-tight text-white flex items-center gap-1.5">
                  Banana Assistant
                  <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-normal">
                    ผู้ช่วยอัจฉริยะ
                  </span>
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                  <span className="text-[11px] text-white/90 font-medium">พร้อมช่วยเหลือตลอด 24 ชม.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                title="ล้างบทสนทนา"
                className="h-8 w-8 text-white hover:bg-white/20 rounded-lg active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-lg active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area (Standard Scroll Container to ensure perfect boundary sizing) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 bg-gradient-to-b from-amber-50/40 via-slate-50/70 to-slate-100/50 space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex gap-2 sm:gap-2.5 max-w-[88%] sm:max-w-[85%] ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {msg.sender === "bot" && (
                    <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-amber-700" />
                    </div>
                  )}

                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm min-w-0 break-words ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-br-xs font-medium"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-xs"
                    }`}
                  >
                    {msg.sender === "bot"
                      ? renderFormattedText(msg.text)
                      : msg.text}

                    {/* ⚡ ข้อความด่วน 3 หมวดหมู่หลัก (Clickable Quick Action Cards) */}
                    {msg.showQuickPillars && (
                      <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-100 w-full">
                        {QUICK_PILLARS.map((pillar) => (
                          <button
                            key={pillar.id}
                            onClick={() => handleSendMessage(pillar.query)}
                            className="w-full text-left p-2 rounded-xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200/90 text-slate-800 transition-all flex items-center justify-between gap-2 group active:scale-98 shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-6 h-6 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                                {renderIcon(pillar.iconType)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs text-slate-900 group-hover:text-amber-900 transition-colors truncate">
                                  {pillar.title}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate mt-0.5 leading-tight">
                                  {pillar.description}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Bot Action Button (If provided) */}
                    {msg.actionUrl && msg.actionLabel && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center">
                        <Button
                          size="sm"
                          onClick={() => handleActionClick(msg.actionUrl!)}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-medium rounded-xl h-8 shadow-xs flex items-center justify-center gap-1.5 transition-all group"
                        >
                          <span>{msg.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </div>
                    )}

                    <div
                      className={`text-[10px] mt-1 text-right ${
                        msg.sender === "user" ? "text-orange-200" : "text-slate-400"
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.sender === "user" && (
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs shadow-xs mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-2.5 sm:p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="พิมพ์คำถามเกี่ยวกับการใช้งาน, ความรู้กล้วย, หรือฟาร์ม..."
              className="flex-1 rounded-xl border-slate-200 focus-visible:ring-amber-500 text-xs sm:text-sm py-2 bg-slate-50/50"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isTyping}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl h-9 w-9 sm:h-10 sm:w-10 p-0 flex items-center justify-center shadow-md transition-transform active:scale-95 disabled:opacity-50 shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* 🟢 Toggle Floating Button */}
      <Button
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center p-0 group"
        aria-label="Open assistant"
      >
        {isOpen ? (
          <X className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:rotate-90 duration-200" />
        ) : (
          <div className="relative flex items-center justify-center">
            <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500"></span>
            </span>
          </div>
        )}
      </Button>
    </div>
  );
};

export default BananaChatbot;
