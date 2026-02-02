import { useState, useEffect, useRef } from "react";
import { Bot, Sparkles, X, Send, ChevronDown, Minimize2 } from "lucide-react";
import axios from "axios";
import { Button } from "./ui/button";

interface AIAssistantProps {
    selectedToken: string;
    currentPrice: string;
    previousGames: any[];
}

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

const API_KEY = "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";
const MODEL_NAME = "openai/gpt-oss-20b:free"; // openrouter model

export function AIAssistant({ selectedToken, currentPrice, previousGames }: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: `Hello! I'm your Winza AI assistant. I have access to the latest **${selectedToken}** market data and round history. How can I help you predict the next move?`,
                timestamp: Date.now()
            }]);
        }
    }, [selectedToken]);

    // Fetch market context
    const getMarketContext = async () => {
        try {
            const symbolMap: { [key: string]: string } = {
                'BTC': 'BTCUSDT',
                'ETH': 'ETHUSDT',
                'LNRA': 'BTCUSDT'
            };
            const symbol = symbolMap[selectedToken] || 'BTCUSDT';

            const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
                params: {
                    symbol: symbol,
                    interval: '1m',
                    limit: 60 // Fetch last hour (60 candles)
                }
            });

            // Format for AI: [Time, Open, High, Low, Close]
            const candles = response.data.map((k: any[]) => ({
                t: new Date(k[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                o: parseFloat(k[1]),
                h: parseFloat(k[2]),
                l: parseFloat(k[3]),
                c: parseFloat(k[4])
            }));
            return candles;
        } catch (e) {
            console.error("Failed to fetch binance data", e);
            return [];
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!inputValue.trim()) return;

        const userMsg: Message = {
            role: 'user',
            content: inputValue,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        try {
            const candles = await getMarketContext();
            const roundsContext = previousGames.map(g =>
                `Round ${g.id}: Result ${g.result} (Locked: ${g.lockedPrice}, Closed: ${g.lastPrice})`
            ).join('\n');

            // Convert full candle data to JSON string for the prompt
            const marketDataStr = JSON.stringify(candles, null, 2);

            const systemPrompt = `
You are Winza AI, a crypto gambling expert.
Context:
- Token: ${selectedToken}
- Current Price: ${currentPrice}

MARKET DATA (Last 60 minutes of 1m candles):
Format: { t: Time, o: Open, h: High, l: Low, c: Close }
${marketDataStr}

LAST 3 ROUNDS:
${roundsContext}

Your goal is to help the user with trading predictions. Analyze the provided candle data carefully for patterns (trends, support/resistance, volatility).
Be concise (max 2-3 sentences). 
Use bold text for predictions like **UP** or **DOWN**. 
Maintain a helpful but degens/crypto-native tone.
            `;

            const validMessages = messages.filter(m => m.role !== 'system').map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...validMessages,
                    { role: "user", content: userMsg.content }
                ]
            }, {
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000",
                }
            });

            const aiText = response.data.choices[0].message.content;

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: aiText,
                timestamp: Date.now()
            }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting to the neural net. Please try again.",
                timestamp: Date.now()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    // Simple Markdown Parser
    const renderMarkdown = (text: string) => {
        // Split by code blocks first
        const parts = text.split(/(`[^`]+`)/g);

        return parts.map((part, index) => {
            if (part.startsWith('`') && part.endsWith('`')) {
                return (
                    <code key={index} className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 font-mono text-xs break-all">
                        {part.slice(1, -1)}
                    </code>
                );
            }

            // Process bold
            const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
            return (
                <span key={index}>
                    {boldParts.map((subPart, subIndex) => {
                        if (subPart.startsWith('**') && subPart.endsWith('**')) {
                            return <strong key={subIndex}>{subPart.slice(2, -2)}</strong>;
                        }
                        return subPart;
                    })}
                </span>
            );
        });
    };

    if (!isOpen) {
        return (
            <div className="fixed bottom-6 right-6 z-50 animate-in fade-in zoom-in duration-300">
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-lg shadow-orange-500/20 flex items-center justify-center transition-transform hover:scale-105 group"
                >
                    <Bot className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />
                </Button>
            </div>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 z-50 w-full max-w-[380px] transition-all duration-300 ease-in-out ${isMinimized ? 'h-[60px]' : 'h-[600px]'} animate-in slide-in-from-bottom-10`}>
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full ring-1 ring-black/5 dark:ring-white/10">
                {/* Header */}
                <div onClick={() => !isMinimized && setIsMinimized(true)} className={`bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 p-4 flex justify-between items-center text-white cursor-pointer border-b border-zinc-800`}>
                    <div className="flex items-center gap-3">
                        <div className="content-center bg-gradient-to-br from-red-500 to-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/10">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Winza AI</h3>
                            <div className="flex items-center gap-1.5 opacity-60 text-[10px] font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Online • {MODEL_NAME.split('/')[1]}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            {isMinimized ? <ChevronDown className="w-4 h-4 rotate-180" /> : <Minimize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                            className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {!isMinimized && (
                    <>
                        {/* Chat History */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-black/20 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm break-words ${msg.role === 'user'
                                            ? 'bg-red-600 text-white rounded-tr-none'
                                            : 'bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                                        }`}>
                                        <p className="leading-relaxed whitespace-pre-wrap break-words">
                                            {renderMarkdown(msg.content)}
                                        </p>
                                        <span className={`text-[10px] block mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl rounded-tl-none p-4 shadow-sm flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-800">
                            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask for a prediction..."
                                    className="flex-1 bg-gray-100 dark:bg-zinc-900 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none text-gray-900 dark:text-white placeholder-gray-500 transition-all font-medium"
                                />
                                <Button
                                    type="submit"
                                    disabled={!inputValue.trim() || isTyping}
                                    className="h-11 w-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center justify-center shrink-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Send className="w-4 h-4 ml-0.5" />
                                </Button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
