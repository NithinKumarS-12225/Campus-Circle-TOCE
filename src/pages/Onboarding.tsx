import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { User, GraduationCap, Phone, Building2, ArrowRight, Sparkles } from 'lucide-react';

export default function Onboarding() {
  const { user, dbUser, loading } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [year, setYear] = useState('1st Year');
  const [branch, setBranch] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (dbUser) {
      setName(dbUser.name || '');
      setYear(dbUser.year || '1st Year');
      setBranch(dbUser.branch || '');
      setPhoneNumber(dbUser.phoneNumber || '');
    }
  }, [dbUser]);

  // If already onboarded, go home
  if (!loading && dbUser && dbUser.onboarded) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        year,
        branch,
        phoneNumber,
        onboarded: true
      });
      navigate('/');
    } catch (error) {
      console.error("Error during onboarding:", error);
      alert('Failed to save details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-white"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 mx-auto mb-6">
            <Sparkles className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Welcome to CampusCircle!</h1>
          <p className="text-gray-500">Let's set up your student profile to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <User className="w-4 h-4 text-orange-500" /> Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <GraduationCap className="w-4 h-4 text-orange-500" /> Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Alumni">Alumni</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 text-orange-500" /> Department
              </label>
              <input
                type="text"
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. CSE"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <Phone className="w-4 h-4 text-orange-500" /> Phone Number
            </label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-2xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSaving ? 'Saving...' : (
              <>Complete Setup <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
