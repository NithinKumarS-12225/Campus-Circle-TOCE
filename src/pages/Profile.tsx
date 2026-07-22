import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, User as UserIcon, LogOut, PiggyBank, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const { user, dbUser, logout } = useAuth();
  
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        year,
        branch,
        phoneNumber
      });
      // Success feedback is handled by real-time sync, but we can show a brief message
      alert('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!dbUser) return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 h-32"></div>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 h-96"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -z-10"></div>
        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shrink-0 border-4 border-white shadow-sm">
          <UserIcon className="w-12 h-12" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{dbUser.name}</h1>
          <p className="text-gray-500">{dbUser.email}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
            <div className="flex items-center gap-1.5 text-orange-700 font-semibold bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
              <ShieldCheck className="w-4 h-4" />
              {dbUser.trustScore || 0} successful deals
            </div>
            <div className="flex items-center gap-1.5 text-green-700 font-semibold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
              <PiggyBank className="w-4 h-4" />
              Saved ₹{dbUser.totalSavings || 0}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSave} 
        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6"
      >
        <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-4">Edit Profile</h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Year of Study</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white transition-shadow"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="Alumni">Alumni</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
            <input
              type="text"
              required
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-shadow"
              placeholder="e.g., Computer Science"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-shadow"
              placeholder="e.g., 9876543210"
            />
            <p className="text-xs text-gray-500 mt-1">Only visible to buyers who express interest in your items.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white py-2.5 rounded-lg font-semibold hover:from-orange-700 hover:to-amber-700 disabled:opacity-70 transition-colors shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            type="button"
            onClick={logout}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </motion.form>
    </div>
  );
}
