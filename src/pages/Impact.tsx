import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI } from '@google/genai';
import { motion } from 'motion/react';
import { Leaf, TrendingUp, Zap, IndianRupee, BookOpen, Monitor, PenTool, Shirt, Package, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ImpactData {
  summary: {
    total_money_saved: string;
    items_reused: number;
    estimated_energy_saved_kwh: number;
  };
  category_breakdown: {
    category: string;
    items_reused: number;
    money_saved: string;
  }[];
  weekly_trends: {
    week: string;
    money_saved: string;
    items_reused: number;
  }[];
  insights: string[];
}

export default function Impact() {
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAndAnalyzeData = async () => {
      try {
        // 1. Fetch all listings
        const querySnapshot = await getDocs(collection(db, 'listings'));
        const listings = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            title: data.title,
            category: data.category,
            price: data.price,
            originalPrice: data.originalPrice,
            status: data.status,
            createdAt: data.createdAt
          };
        });

        // 2. Prepare data for AI
        const marketplaceData = JSON.stringify(listings);

        // 3. Call Gemini API
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = `You are an AI assistant for a campus marketplace app focused on sustainability and cost savings.
        The dashboard is now titled "Sustainability and Social Impact Dashboard".

Input data:
${marketplaceData}

Analyze the data and return ONLY valid JSON with the following fields:

{
  "summary": {
    "total_money_saved": "<amount in INR>",
    "items_reused": <number>,
    "estimated_energy_saved_kwh": <number>,
    "carbon_offset_kg": <number>
  },

  "category_breakdown": [
    {
      "category": "books",
      "items_reused": <number>,
      "money_saved": "<amount in INR>",
      "carbon_saved": <number>
    },
    {
      "category": "lab coat",
      "items_reused": <number>,
      "money_saved": "<amount in INR>",
      "carbon_saved": <number>
    },
    {
      "category": "electronics",
      "items_reused": <number>,
      "money_saved": "<amount in INR>",
      "carbon_saved": <number>
    },
    {
      "category": "stationery",
      "items_reused": <number>,
      "money_saved": "<amount in INR>",
      "carbon_saved": <number>
    }
  ],

  "weekly_trends": [
    {
      "week": "Week 1",
      "money_saved": "<amount in INR>",
      "items_reused": <number>,
      "carbon_saved": <number>
    },
    {
      "week": "Week 2",
      "money_saved": "<amount in INR>",
      "items_reused": <number>,
      "carbon_saved": <number>
    }
  ],

  "insights": [
    "<short insight 1>",
    "<short insight 2>",
    "<short insight 3>"
  ]
}

Rules:
- Output only JSON (no explanation)
- Keep numbers realistic for a college campus
- Assume:
  - Each reused book saves approx 2 kWh energy and 0.5kg CO2
  - Each reused lab item saves approx 1.5 kWh and 0.3kg CO2
  - Each reused electronic item saves approx 15 kWh and 5kg CO2
- Keep insights short (1 line each)
- Focus on sustainability and social impact`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });

        if (response.text) {
          const parsedData = JSON.parse(response.text) as any;
          setImpactData(parsedData);
        } else {
          throw new Error("No response from AI");
        }
      } catch (err) {
        console.error("Failed to generate impact data:", err);
        setError('Failed to load sustainability analytics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndAnalyzeData();
  }, []);

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('book')) return <BookOpen className="w-5 h-5" />;
    if (cat.includes('lab') || cat.includes('coat')) return <Shirt className="w-5 h-5" />;
    if (cat.includes('electronic')) return <Monitor className="w-5 h-5" />;
    if (cat.includes('stationery')) return <PenTool className="w-5 h-5" />;
    return <Package className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl mt-6"></div>
      </div>
    );
  }

  if (error || !impactData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <Leaf className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">{error || "Something went wrong"}</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 md:pb-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
          <Leaf className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sustainability & Social Impact</h1>
          <p className="text-gray-500">Real-time circular economy & environmental analytics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange-500 to-amber-600 p-5 rounded-2xl text-white shadow-sm relative overflow-hidden"
        >
          <IndianRupee className="absolute -right-2 -bottom-2 w-20 h-20 opacity-10" />
          <p className="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1">Savings</p>
          <h2 className="text-2xl font-black">{impactData.summary.total_money_saved}</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl text-white shadow-sm relative overflow-hidden"
        >
          <TrendingUp className="absolute -right-2 -bottom-2 w-20 h-20 opacity-10" />
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Reused</p>
          <h2 className="text-2xl font-black">{impactData.summary.items_reused} Items</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-2xl text-white shadow-sm relative overflow-hidden"
        >
          <Zap className="absolute -right-2 -bottom-2 w-20 h-20 opacity-10" />
          <p className="text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">Energy Saved</p>
          <h2 className="text-2xl font-black">{impactData.summary.estimated_energy_saved_kwh} kWh</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl text-white shadow-sm relative overflow-hidden"
        >
          <Leaf className="absolute -right-2 -bottom-2 w-20 h-20 opacity-10" />
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">CO2 Offset</p>
          <h2 className="text-2xl font-black">{(impactData.summary as any).carbon_offset_kg} kg</h2>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
        >
          <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Circular Economy Impact
          </h3>
          <div className="space-y-4">
            {impactData.category_breakdown.map((cat, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                      {getCategoryIcon(cat.category)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 capitalize text-sm">{cat.category}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        {cat.items_reused} Items Reused
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600">{cat.money_saved}</p>
                    <p className="text-[10px] text-emerald-400 font-bold">{(cat as any).carbon_saved}kg CO2 saved</p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((cat.items_reused / impactData.summary.items_reused) * 100, 100)}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Environmental Trends */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
          >
            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Sustainability Trends
            </h3>
            
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={impactData.weekly_trends.map(t => ({
                  name: t.week,
                  carbon: (t as any).carbon_saved || 0,
                  money: parseInt(t.money_saved.replace(/[^0-9]/g, ''), 10) || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="carbon" name="CO2 Saved (kg)" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="money" name="Savings (₹)" stroke="#f59e0b" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* AI Insights */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-12 h-12 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-emerald-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" /> Eco-Insights
            </h3>
            <ul className="space-y-3">
              {impactData.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-emerald-800 font-medium">
                  <div className="w-5 h-5 bg-emerald-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                  </div>
                  {insight}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
