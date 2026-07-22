import React, { useState, useRef, useEffect } from 'react';
import { Groq } from 'groq-sdk';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, User, Sparkles, Loader2 } from 'lucide-react';

interface ProductAIChatProps {
  product: {
    title: string;
    description: string;
    price: number;
    category: string;
    condition: string;
  };
}

export default function ProductAIChat({ product }: ProductAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { 
      role: 'assistant', 
      content: `Hi! I'm your AI assistant for this ${product.title}. Ask me anything about its condition, price, or how it might be useful for your studies!` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        throw new Error('GROQ_API_KEY is not configured. Please add it to your secrets.');
      }

      const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
      
      const systemPrompt = `You are a helpful AI assistant for a campus marketplace app called CampusCircle. 
      You are helping a student learn more about a specific product they are interested in.
      
      Product Details:
      Title: ${product.title}
      Description: ${product.description}
      Price: ₹${product.price}
      Category: ${product.category}
      Condition: ${product.condition}
      
      Guidelines:
      - Be friendly, student-focused, and concise.
      - Answer questions based on the product details provided.
      - If asked about something not in the details, politely say you don't have that specific information and suggest they contact the seller.
      - Encourage sustainable choices (buying second-hand).
      - Do not hallucinate features or conditions not mentioned.`;

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ],
        model: 'llama-3.3-70b-versatile',
      });

      const assistantMessage = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error: any) {
      console.error("Groq API Error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: error.message.includes('GROQ_API_KEY') 
          ? "I'm currently offline (API key missing). Please contact the seller directly for queries!" 
          : "Oops! Something went wrong. Please try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 md:bottom-8">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[32px] shadow-2xl border border-gray-100 w-[350px] sm:w-[400px] flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Product Assistant</h3>
                  <p className="text-[10px] text-orange-100 font-bold uppercase tracking-widest">Powered by Groq AI</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 h-[400px] overflow-y-auto p-4 space-y-4 bg-gray-50/50"
            >
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                      msg.role === 'user' ? 'bg-orange-600 text-white' : 'bg-white border border-gray-100 text-orange-600 shadow-sm'
                    }`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-orange-600 text-white rounded-tr-none shadow-md shadow-orange-100' 
                        : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-white border border-gray-100 text-orange-600 shadow-sm rounded-lg flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about this product..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all ${
          isOpen ? 'bg-gray-900 text-white rotate-90' : 'bg-orange-600 text-white'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
            <Sparkles className="w-2 h-2 text-white fill-white" />
          </div>
        )}
      </motion.button>
    </div>
  );
}
