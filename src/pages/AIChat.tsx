import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, MessageSquare, Lightbulb, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { useExpenses } from '../contexts/ExpenseContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'insight' | 'recommendation';
}

// Replace this with your actual Gemini API key for testing
const GEMINI_API_KEY = "AIzaSyApyrwvanYM-dIv0wpjtO9n9o5T2NX4hLI";

const AIChat = () => {
  const { expenses, categories } = useExpenses();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        text: `Hello ${user?.displayName || user?.email.split('@')[0]}! 👋 I'm your AI financial assistant. I can help you analyze your spending patterns, provide budgeting advice, and answer questions about your finances. What would you like to know?`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages([welcomeMessage]);
    }
  }, [user, messages.length]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    if (!GEMINI_API_KEY) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: 'Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your .env file.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      }]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: inputMessage }] }]
          })
        }
      );
      const data = await response.json();
      let aiText = 'Sorry, I could not get a response from Gemini.';
      if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
        aiText = data.candidates[0].content.parts[0].text;
      } else if (data.error && data.error.message) {
        aiText = `Gemini API error: ${data.error.message}`;
      }
      const aiResponse: Message = {
        id: (Date.now() + 2).toString(),
        text: aiText,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 3).toString(),
        text: 'Error connecting to Gemini: ' + (error?.message || error),
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    setTimeout(() => handleSendMessage(), 100);
  };

  const quickQuestions = [
    "What's my biggest expense category?",
    "How much do I spend monthly?",
    "Give me budget advice",
    "What are my spending trends?",
    "How can I save more money?"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Financial Assistant</h1>
          <p className="text-muted-foreground">Get personalized insights and advice powered by Gemini AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Interface */}
        <Card className="financial-card lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Chat with AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px] p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className={message.sender === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                        {message.sender === 'ai' ? <Bot className="w-4 h-4" /> : user?.displayName?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : message.type === 'insight'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          : message.type === 'recommendation'
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.sender === 'ai' && message.type === 'insight' && (
                          <TrendingUp className="w-4 h-4 mt-0.5 text-blue-600" />
                        )}
                        {message.sender === 'ai' && message.type === 'recommendation' && (
                          <Lightbulb className="w-4 h-4 mt-0.5 text-green-600" />
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      </div>
                      <p className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <p className="text-sm">AI is thinking...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me about your finances..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          <Card className="financial-card">
            <CardHeader>
              <CardTitle className="text-lg">Quick Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full text-left justify-start h-auto p-3"
                  onClick={() => handleQuickQuestion(question)}
                  disabled={isLoading}
                >
                  <span className="text-xs">{question}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="financial-card">
            <CardHeader>
              <CardTitle className="text-lg">AI Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Smart Insights</p>
                  <p className="text-xs text-muted-foreground">Pattern recognition</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Recommendations</p>
                  <p className="text-xs text-muted-foreground">Personalized advice</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Budget Planning</p>
                  <p className="text-xs text-muted-foreground">Smart budgets</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="financial-card">
            <CardHeader>
              <CardTitle className="text-lg">Powered by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold">Gemini 2.0</p>
                <p className="text-xs text-muted-foreground">Google's Advanced AI</p>
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-center text-muted-foreground">
                  This AI assistant analyzes your expense data locally to provide personalized financial insights and recommendations.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
