import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, RotateCcw, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBotResponse, ChatMessage } from "@/lib/chatbot-knowledge";

const BananaChatbot = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // ซ่อน Chat Widget ในหน้า Auth / Login / Reset Password
  const isAuthPage = location.pathname.startsWith("/auth") || location.pathname === "/reset-password";
  if (isAuthPage) {
    return null;
  }

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "bot",
      text: "สวัสดีครับ ผมคือ Banana Expert \nยินดีตอบทุกคำถามเรื่องสายพันธุ์กล้วย การปลูก การดูแลรักษาครับ พิมพ์คำถามเข้ามาได้เลยครับ!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

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

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate thinking delay
    setTimeout(() => {
      const botReplyText = getBotResponse(text);
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: botReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "bot",
        text: "เริ่มต้นการสนทนาใหม่แล้วครับ มีข้อสงสัยเรื่องกล้วยเรื่องไหน พิมพ์ถามได้เลยครับ ",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <Card className="w-[calc(100vw-24px)] sm:w-[390px] md:w-[420px] h-[520px] max-h-[calc(100dvh-85px)] flex flex-col mb-2.5 shadow-2xl rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-600 text-white px-3.5 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between shadow-sm select-none">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 flex items-center justify-center text-base sm:text-lg shrink-0">
                🍌
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base leading-tight text-white flex items-center gap-1.5">
                  Banana Assistant
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] text-white/90 font-medium">ผู้เชี่ยวชาญพร้อมตอบ</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                title="ล้างบทสนทนา"
                className="h-8 w-8 text-white hover:bg-white/20 rounded-lg active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-lg active:scale-95"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-3 sm:p-4 bg-slate-50/70">
            <div className="space-y-3 sm:space-y-3.5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 sm:gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "bot" && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-xs sm:text-sm">
                      🍌
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${msg.sender === "user"
                      ? "bg-orange-600 text-white rounded-br-xs font-medium"
                      : "bg-white text-slate-800 border border-slate-200/70 rounded-bl-xs whitespace-pre-line"
                      }`}
                  >
                    {msg.text}
                    <div
                      className={`text-[10px] mt-1 text-right ${msg.sender === "user" ? "text-orange-200" : "text-slate-400"
                        }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.sender === "user" && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-2 sm:gap-2.5 items-center">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-xs sm:text-sm">
                    🍌
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
          </ScrollArea>

          {/* Input Bar */}
          <div className="p-2.5 sm:p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="พิมพ์คำถามเกี่ยวกับกล้วยที่นี่..."
              className="flex-1 rounded-xl border-slate-200 focus-visible:ring-orange-500 text-xs sm:text-sm py-2"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-9 w-9 sm:h-10 sm:w-10 p-0 flex items-center justify-center shadow-md transition-transform active:scale-95 disabled:opacity-50 shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Toggle Floating Button */}
      <Button
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center p-0 group"
        aria-label="Open banana assistant"
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
