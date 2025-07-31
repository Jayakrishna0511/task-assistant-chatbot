import React, { useEffect, useState, useRef } from "react";
import { Send, MessageCircle, Clock, Trash2, CheckCircle, Bot, User, Sparkles, Plus, Zap, Star } from "lucide-react";

const ChatBot = () => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "✨ Welcome! I'm your AI task assistant with superpowers!\n\n🎯 **What I can do:**\n• 📝 Create smart reminders: *'Remind me to call mom at 6 PM'*\n• 📋 Show all your tasks: *'Show tasks'*\n• 🗑️ Delete completed tasks: *'Delete task 1'*\n\nReady to boost your productivity? Let's get started! 🚀",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [messageCount, setMessageCount] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);
  const [contactInfo, setContactInfo] = useState({ phone: "", email: "" });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [particles, setParticles] = useState([]);

  // Generate floating particles for background
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setMessageCount(prev => prev + 1);
    
    // Check if this is a reminder command
    const message = input.trim().toLowerCase();
    if (message.startsWith("remind me")) {
      const timeMatch = message.match(/at\s(.+)$/);
      const task = message.replace(/remind me to\s?/i, "").replace(/at .+/, "").trim();
      
      if (task && timeMatch) {
        // Store the task details and show contact modal
        setPendingTask({ task, time: timeMatch[1] });
        setShowContactModal(true);
        setInput("");
        setMessages((prev) => [...prev, { 
          sender: "bot", 
          text: "📱 Great! To send you notifications, I'll need your contact info. Please provide your phone number or email address.", 
          timestamp: new Date() 
        }]);
        return;
      }
    }

    setInput("");
    setIsBotTyping(true);

    try {
      const response = await fetch("https://task-assistant-chatbot.onrender.com/api/chat", {
    //   const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input.trim() }),
      });

      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();
      
      setTimeout(() => {
        setIsBotTyping(false);
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: data.reply, timestamp: new Date() }
        ]);
        setMessageCount(prev => prev + 1);
      }, 1200);

    } catch (err) {
      console.error("Chat error:", err);
      setIsBotTyping(false);
      setIsConnected(false);
      setMessages((prev) => [
        ...prev,
        { 
          sender: "bot", 
          text: "🔌 Oops! I can't reach the server right now. Make sure the backend is running & try again.", 
          timestamp: new Date(),
          isError: true
        }
      ]);
    }
  };

  const handleContactSubmit = async () => {
    if (!contactInfo.phone && !contactInfo.email) {
      alert("Please provide either phone number or email address");
      return;
    }

    try {
      const response = await fetch("https://task-assistant-chatbot.onrender.com/api/chat", {
    //   const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: `remind me to ${pendingTask.task} at ${pendingTask.time}`,
          phone: contactInfo.phone,
          email: contactInfo.email
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, { 
          sender: "bot", 
          text: `✅ Perfect! I'll remind you to **${pendingTask.task}** at **${pendingTask.time}** via ${contactInfo.phone ? 'SMS' : 'email'}. 📲`, 
          timestamp: new Date() 
        }]);
        
        setShowContactModal(false);
        setPendingTask(null);
        setContactInfo({ phone: "", email: "" });
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to save task. Please try again.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { text: "Show tasks", icon: <CheckCircle size={16} />, color: "bg-orange-500 hover:bg-orange-600" },
    { text: "Remind me to exercise at 7 AM", icon: <Clock size={16} />, color: "bg-orange-500 hover:bg-orange-600" },
    { text: "Delete task 1", icon: <Trash2 size={16} />, color: "bg-orange-500 hover:bg-orange-600" },
  ];

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .split('\n').map((line, i) => (
        <div key={i} dangerouslySetInnerHTML={{ __html: line }} className="leading-relaxed" />
      ));
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex flex-col">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-orange-500/20 blur-sm animate-float"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>

      {/* Main Container */}
      <div className="relative flex flex-col h-full w-full max-w-none sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="relative bg-white border-b-4 border-orange-500 h-[10vh] min-h-[80px] flex-shrink-0">
          <div className="relative p-3 sm:p-4 lg:p-6 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="relative group">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-xl border-2 sm:border-4 border-white">
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  {isConnected && (
                    <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-orange-500 rounded-full border-2 sm:border-4 border-white shadow-lg"></div>
                  )}
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-black leading-none">
                    AI Task Assistant
                  </h1>
                  <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                    <div className="flex items-center text-black font-bold">
                      <Sparkles size={12} className="mr-1 sm:mr-1.5 text-orange-500" />
                      <span className="hidden sm:inline">{isConnected ? "Online & Ready" : "Reconnecting..."}</span>
                      <span className="sm:hidden">{isConnected ? "Online" : "Offline"}</span>
                    </div>
                    <div className="flex items-center text-gray-600 font-semibold">
                      <Star size={12} className="mr-1 text-orange-500" />
                      {messageCount}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="hidden md:flex items-center space-x-4">
                <div className="px-4 lg:px-6 py-2 lg:py-3 bg-black text-white rounded-full border-2 lg:border-4 border-orange-500">
                  <div className="flex items-center text-xs lg:text-sm font-bold">
                    <Zap size={12} className="mr-1 lg:mr-2 text-orange-500" />
                    Premium AI
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 scroll-smooth min-h-0">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} group`}
              style={{
                animation: `slideInFromBottom 0.6s ease-out ${i * 0.1}s both`
              }}
            >
              <div
                className={`relative w-full max-w-[85%] sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl transition-all duration-300 hover:scale-[1.01] ${
                  msg.sender === "user" ? "ml-2 sm:ml-4 lg:ml-12" : "mr-2 sm:mr-4 lg:mr-12"
                }`}
              >
                {/* Message Bubble */}
                <div
                  className={`relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl border-2 sm:border-4 transition-all duration-300 ${
                    msg.sender === "user"
                      ? "bg-orange-500 text-white border-orange-600 shadow-orange-500/25"
                      : msg.isError
                      ? "bg-white border-red-500 text-red-800 shadow-red-500/10"
                      : "bg-white border-black text-black shadow-black/20"
                  }`}
                >
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    {msg.sender === "bot" && (
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1 shadow-lg border-2 ${
                        msg.isError 
                          ? "bg-red-500 border-white" 
                          : "bg-orange-500 border-white"
                      }`}>
                        <Bot size={14} className="text-white sm:w-4 sm:h-4" />
                      </div>
                    )}
                    
                    {msg.sender === "user" && (
                      <User size={14} className="text-orange-100 mt-1 sm:mt-1.5 flex-shrink-0 sm:w-4 sm:h-4" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm leading-relaxed">
                        {msg.sender === "bot" && i === messages.length - 1 && isBotTyping ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">AI is thinking</span>
                            <div className="flex space-x-1">
                              {[0, 1, 2].map((dot) => (
                                <div
                                  key={dot}
                                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full animate-bounce"
                                  style={{ animationDelay: `${dot * 0.2}s` }}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 sm:space-y-2">
                            {formatMessage(msg.text)}
                          </div>
                        )}
                      </div>
                      
                      <div className={`text-xs mt-1 sm:mt-2 opacity-70 ${
                        msg.sender === "user" ? "text-orange-100" : "text-gray-500"
                      }`}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="px-3 sm:px-4 lg:px-6 pb-2 sm:pb-4 flex-shrink-0">
            <div className="text-xs sm:text-sm text-white mb-2 sm:mb-4 flex items-center font-medium">
              <Plus size={14} className="mr-2 text-orange-500" />
              Try these quick actions
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => setInput(action.text)}
                  className={`group relative overflow-hidden px-3 sm:px-5 py-2 sm:py-3 ${action.color} text-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-black text-xs sm:text-sm`}
                  style={{
                    animation: `slideInFromBottom 0.6s ease-out ${0.5 + i * 0.1}s both`
                  }}
                >
                  <div className="relative flex items-center space-x-1 sm:space-x-2">
                    {action.icon}
                    <span className="font-medium">{action.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="relative bg-white border-t-4 border-orange-500 flex-shrink-0">
          <div className="relative p-3 sm:p-4 lg:p-6">
            <div className="flex items-end space-x-2 sm:space-x-4">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="✨ Share your thoughts or ask me anything..."
                  className="relative w-full px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 bg-white border-2 sm:border-4 border-black rounded-xl sm:rounded-2xl focus:ring-2 sm:focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 resize-none shadow-xl transition-all duration-300 placeholder-gray-500 text-black font-medium text-sm sm:text-base"
                  rows="1"
                  style={{
                    minHeight: '40px',
                    maxHeight: '100px',
                    lineHeight: '1.4'
                  }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                  }}
                />
              </div>
              
              <button
                onClick={handleSend}
                disabled={!input.trim() || isBotTyping}
                className="group relative w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 focus:ring-2 sm:focus:ring-4 focus:ring-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 disabled:hover:scale-100 border-2 sm:border-4 border-black"
              >
                <Send size={16} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2 sm:mt-4 text-xs text-gray-500">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <span className="flex items-center">
                  <Sparkles size={10} className="mr-1 text-orange-500" />
                  <span className="hidden sm:inline">Powered by AI</span>
                  <span className="sm:hidden">AI Powered</span>
                </span>
                <span className="hidden sm:inline">Press Enter to send</span>
              </div>
              <span className="hidden sm:inline">Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border-4 border-orange-500 p-6 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black text-black mb-2">Contact Information</h3>
              <p className="text-gray-600 text-sm">Choose how you'd like to receive your task reminder:</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">📱 Phone Number (SMS)</label>
                <input
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 border-2 border-black rounded-xl focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 text-black font-medium"
                />
              </div>

              <div className="text-center text-gray-500 font-bold">OR</div>

              <div>
                <label className="block text-sm font-bold text-black mb-2">✉️ Email Address</label>
                <input
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border-2 border-black rounded-xl focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 text-black font-medium"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowContactModal(false);
                  setPendingTask(null);
                  setContactInfo({ phone: "", email: "" });
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-black rounded-xl font-bold hover:bg-gray-300 transition-colors border-2 border-black"
              >
                Cancel
              </button>
              <button
                onClick={handleContactSubmit}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors border-2 border-black shadow-lg"
              >
                Save Task
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ChatBot;


















