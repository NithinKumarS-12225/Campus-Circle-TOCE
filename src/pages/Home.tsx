import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, increment, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, ShieldCheck, Clock, Flame, Zap, Package, BadgeCheck, MessageCircle, Phone, Bell, Camera, Sparkles, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';
import VisualSearch from '../components/VisualSearch';

export default function Home() {
  const { user, dbUser } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  
  // Filters
  const [category, setCategory] = useState('all');
  const [condition, setCondition] = useState('all');
  const [branch, setBranch] = useState('all');
  const [maxPrice, setMaxPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Buyer Interaction State
  const [contactingSellerFor, setContactingSellerFor] = useState<string | null>(null);
  const [sellerContactInfo, setSellerContactInfo] = useState<any | null>(null);
  const [isFetchingSeller, setIsFetchingSeller] = useState(false);

  useEffect(() => {
    let q = query(
      collection(db, 'listings'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setListings(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching listings:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleInterest = async (listing: any) => {
    if (!user || !dbUser) return;
    
    setIsFetchingSeller(true);
    try {
      // 1. Fetch seller details
      const sellerDoc = await getDoc(doc(db, 'users', listing.sellerId));
      if (sellerDoc.exists()) {
        setSellerContactInfo(sellerDoc.data());
      }

      // 2. Add interest record
      await addDoc(collection(db, 'interests'), {
        listingId: listing.id,
        listingTitle: listing.title,
        buyerId: user.uid,
        buyerName: dbUser.name,
        buyerYear: dbUser.year || 'Unknown',
        buyerBranch: dbUser.branch || 'Unknown',
        sellerId: listing.sellerId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // 3. Notify seller
      await addDoc(collection(db, 'notifications'), {
        userId: listing.sellerId,
        message: `${dbUser.name} is interested in buying your item: ${listing.title}`,
        listingId: listing.id,
        read: false,
        createdAt: new Date().toISOString()
      });

      // 4. Increment interest count on the listing
      await updateDoc(doc(db, 'listings', listing.id), {
        interestCount: increment(1)
      });

      // 5. Show contact section
      setContactingSellerFor(listing.id);
    } catch (error) {
      console.error("Error expressing interest:", error);
      alert('Failed to contact seller. Please try again.');
    } finally {
      setIsFetchingSeller(false);
    }
  };

  const handleNotify = async (listing: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'waitlist'), {
        userId: user.uid,
        category: listing.category,
        listingTitle: listing.title,
        createdAt: new Date().toISOString()
      });
      alert("You will be notified when a similar item is available!");
    } catch (error) {
      console.error("Error adding to waitlist:", error);
      alert("Failed to subscribe to notifications.");
    }
  };

  const handleStartChat = async (listing: any) => {
    if (!user || !dbUser) return;
    
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, 
        where('listingId', '==', listing.id),
        where('participantIds', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(q);
      let chatId;
      
      if (!snapshot.empty) {
        chatId = snapshot.docs[0].id;
      } else {
        const newChat = await addDoc(chatsRef, {
          listingId: listing.id,
          listingTitle: listing.title,
          buyerId: user.uid,
          buyerName: dbUser.name,
          sellerId: listing.sellerId,
          sellerName: listing.sellerName,
          participantIds: [user.uid, listing.sellerId],
          lastMessage: 'Chat started',
          lastMessageTime: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
        chatId = newChat.id;
      }
      
      navigate(`/inbox?chat=${chatId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Failed to start chat.");
    }
  };

  const filteredListings = listings.filter(item => {
    if (category !== 'all' && item.category !== category) return false;
    if (condition !== 'all' && item.condition !== condition) return false;
    if (branch !== 'all' && item.sellerBranch !== branch) return false;
    if (maxPrice && item.price > Number(maxPrice)) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const uniqueBranches = Array.from(new Set(listings.map(item => item.sellerBranch).filter(Boolean)));

  const getDealScore = (price: number, originalPrice?: number) => {
    if (!originalPrice) return null;
    const ratio = price / originalPrice;
    if (ratio <= 0.4) return { label: 'Great Deal', color: 'bg-green-100 text-green-700' };
    if (ratio <= 0.7) return { label: 'Fair', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Overpriced', color: 'bg-red-100 text-red-700' };
  };

  // Dummy recommendations based on current category and branch filter
  const dummyRecommendations = [
    { id: 'd1', title: 'Engineering Drawing Kit', price: 450, category: 'stationery', condition: 'Good', branch: 'Mechanical', imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=400&auto=format&fit=crop' },
    { id: 'd2', title: 'Casio fx-991EX Calculator', price: 800, category: 'electronics', condition: 'New', branch: 'Computer Science', imageUrl: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?q=80&w=400&auto=format&fit=crop' },
    { id: 'd3', title: 'Physics Lab Manual', price: 150, category: 'books', condition: 'Fair', branch: 'Civil', imageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=400&auto=format&fit=crop' },
    { id: 'd4', title: 'First Year Lab Coat', price: 250, category: 'lab coat', condition: 'Good', branch: 'Chemical', imageUrl: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?q=80&w=400&auto=format&fit=crop' },
    { id: 'd5', title: 'Data Structures Book', price: 300, category: 'books', condition: 'New', branch: 'Computer Science', imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop' },
  ].filter(item => {
    if (category !== 'all' && item.category !== category) return false;
    if (branch !== 'all' && item.branch !== branch) return false;
    return true;
  }).slice(0, 4);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for books, lab coats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-shadow"
            />
          </div>
          <button 
            onClick={() => setIsVisualSearchOpen(true)}
            className="p-2.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors border border-orange-100 flex items-center justify-center group"
            title="Search by image"
          >
            <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 min-w-[120px] outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Categories</option>
            <option value="books">Books</option>
            <option value="lab coat">Lab Coat</option>
            <option value="electronics">Electronics</option>
            <option value="stationery">Stationery</option>
            <option value="bundle">Bundles</option>
            <option value="question papers">Question Papers</option>
            <option value="exam notes">Exam Notes</option>
            <option value="other">Other</option>
          </select>
          
          <select 
            value={condition} 
            onChange={(e) => setCondition(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 min-w-[120px] outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Conditions</option>
            <option value="New">New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
          </select>

          <select 
            value={branch} 
            onChange={(e) => setBranch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 min-w-[120px] outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Branches</option>
            {uniqueBranches.map(b => (
              <option key={b as string} value={b as string}>{b as string}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Max Price (₹)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 min-w-[120px] outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Visual Search Modal */}
      <VisualSearch 
        isOpen={isVisualSearchOpen} 
        onClose={() => setIsVisualSearchOpen(false)} 
        onSelectListing={(id) => {
          setIsVisualSearchOpen(false);
          navigate(`/listing/${id}`);
        }}
      />

      {/* Smart Recommendations */}
      {!loading && dummyRecommendations.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" /> You may also like / Similar items
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {dummyRecommendations.map(item => (
              <div key={item.id} className="min-w-[220px] bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex-shrink-0 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg z-10">
                  RECOMMENDED
                </div>
                <div className="h-28 bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
                <h4 className="font-semibold text-sm line-clamp-1 text-gray-800">{item.title}</h4>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-extrabold text-orange-600">₹{item.price}</span>
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">{item.condition}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Source Section */}
      {!loading && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" /> Open Source (Question Papers & Notes)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <button 
              onClick={() => setCategory('question papers')}
              className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 text-left hover:shadow-md transition-all group"
            >
              <h4 className="font-bold text-blue-900 group-hover:text-blue-600 transition-colors">Question Papers</h4>
              <p className="text-xs text-blue-600/70 mt-1">Access previous year papers shared by seniors</p>
            </button>
            <button 
              onClick={() => setCategory('exam notes')}
              className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 text-left hover:shadow-md transition-all group"
            >
              <h4 className="font-bold text-indigo-900 group-hover:text-indigo-600 transition-colors">Exam Notes</h4>
              <p className="text-xs text-indigo-600/70 mt-1">Handwritten and digital notes for quick revision</p>
            </button>
          </div>
          
          {/* Display relevant items if any */}
          {listings.filter(l => l.category === 'question papers' || l.category === 'exam notes').length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {listings.filter(l => l.category === 'question papers' || l.category === 'exam notes').slice(0, 5).map(item => (
                <div 
                  key={item.id} 
                  onClick={() => navigate(`/listing/${item.id}`)}
                  className="min-w-[200px] bg-white rounded-xl border border-blue-100 shadow-sm p-3 flex-shrink-0 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="h-24 bg-blue-50 rounded-lg mb-3 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-blue-300" />
                  </div>
                  <h4 className="font-semibold text-sm line-clamp-1 text-gray-800">{item.title}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-blue-600 text-xs uppercase">{item.category.replace(' ', '\n')}</span>
                    <span className="font-extrabold text-gray-900">₹{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Recent Listings
          {listings.length > 0 && (
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {filteredListings.length} items
            </span>
          )}
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
              <div className="h-48 bg-gray-200 w-full"></div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between">
                  <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="pt-4 border-t flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded w-full mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        null
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
          <Package className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No listings found for your filters</h3>
          <p className="text-gray-500 mt-1">Try adjusting your category, condition, or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => {
            const dealScore = getDealScore(listing.price, listing.originalPrice);
            const isSoldOut = listing.status === 'sold' || listing.quantity === 0;
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                transition={{ duration: 0.2 }}
                key={listing.id} 
                onClick={() => navigate(`/listing/${listing.id}`)}
                className={`bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col relative cursor-pointer group ${isSoldOut ? 'opacity-80' : ''}`}
              >
                {isSoldOut && (
                  <div className="absolute top-4 right-4 z-20">
                    <span className="bg-gray-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-sm">
                      SOLD OUT
                    </span>
                  </div>
                )}
                {listing.imageUrl ? (
                  <div className="h-48 w-full bg-gray-100 relative group">
                    <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      <span className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm text-gray-700">
                        {listing.condition}
                      </span>
                      {listing.isBundle && (
                        <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm flex items-center gap-1">
                          <Package className="w-3 h-3" /> Bundle
                        </span>
                      )}
                    </div>
                    {dealScore && (
                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${dealScore.color}`}>
                        {dealScore.label}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gray-50 flex items-center justify-center relative">
                    <Package className="w-12 h-12 text-gray-300" />
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      <span className="bg-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm text-gray-700 border border-gray-100">
                        {listing.condition}
                      </span>
                      {listing.isBundle && (
                        <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm flex items-center gap-1">
                          <Package className="w-3 h-3" /> Bundle
                        </span>
                      )}
                    </div>
                    {dealScore && (
                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${dealScore.color}`}>
                        {dealScore.label}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-2 leading-tight">{listing.title}</h3>
                    <div className="flex flex-col items-end">
                      <span className="font-extrabold text-xl text-orange-600">₹{listing.price}</span>
                      {listing.originalPrice && (
                        <span className="text-xs text-gray-400 line-through">₹{listing.originalPrice}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4 flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-medium border border-orange-100">
                        {listing.category}
                      </span>
                      {listing.quantity > 0 && (
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium border border-indigo-100">
                          Qty: {listing.quantity}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {listing.description}
                    </p>
                    {(listing.usageDuration || listing.reasonForSelling) && (
                      <div className="space-y-1 text-xs text-gray-500 bg-gray-50 p-2 rounded-md border border-gray-100">
                        {listing.usageDuration && <p><span className="font-medium text-gray-700">Usage:</span> {listing.usageDuration}</p>}
                        {listing.reasonForSelling && <p><span className="font-medium text-gray-700">Reason:</span> {listing.reasonForSelling}</p>}
                      </div>
                    )}
                  </div>
                  
                  {/* Live Demand Indicator */}
                  {listing.interestCount > 0 && (
                    <div className="mb-4 flex items-center gap-1.5 text-xs font-medium">
                      {listing.interestCount >= 3 ? (
                        <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                          <Zap className="w-3.5 h-3.5 fill-orange-600" /> High demand
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-md">
                          <Flame className="w-3.5 h-3.5 fill-red-500" /> {listing.interestCount} students interested
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 font-medium text-gray-700">
                        <UserIcon className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[120px]">{listing.sellerName}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {listing.sellerTrustScore >= 3 ? (
                          <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded text-[10px] font-bold w-fit">
                            <BadgeCheck className="w-3 h-3" /> Verified {listing.sellerBranch} {listing.sellerYear}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">
                            {listing.sellerBranch} • {listing.sellerYear}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-orange-700 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded text-[10px] font-bold w-fit">
                          ⭐ {listing.sellerTrustScore || 0} successful deals
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md text-[10px] font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(listing.createdAt))} ago</span>
                      </div>
                    </div>
                  </div>
                  
                  {isSoldOut ? (
                    <button 
                      onClick={() => handleNotify(listing)}
                      className="w-full py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 border border-indigo-200"
                    >
                      <Bell className="w-4 h-4" /> Notify when available
                    </button>
                  ) : listing.sellerId !== user?.uid ? (
                    contactingSellerFor === listing.id ? (
                      <div className="space-y-3 mt-2 pt-4 border-t border-gray-100">
                        <div className="flex gap-2">
                          <button 
                            className="flex-1 py-2.5 bg-orange-50 text-orange-700 hover:bg-orange-100 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            onClick={() => handleStartChat(listing)}
                          >
                            <MessageCircle className="w-4 h-4" /> Chat
                          </button>
                          <a 
                            href={sellerContactInfo?.phoneNumber ? `tel:${sellerContactInfo.phoneNumber}` : '#'}
                            className={`flex-1 py-2.5 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                              sellerContactInfo?.phoneNumber 
                                ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                            onClick={(e) => {
                              if (!sellerContactInfo?.phoneNumber) {
                                e.preventDefault();
                                alert('Seller has not provided a phone number.');
                              }
                            }}
                          >
                            <Phone className="w-4 h-4" /> Call
                          </a>
                        </div>
                        {sellerContactInfo?.phoneNumber && (
                          <p className="text-center text-xs text-gray-500">
                            Seller's Number: <span className="font-medium text-gray-700">{sellerContactInfo.phoneNumber}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleInterest(listing)}
                        disabled={isFetchingSeller}
                        className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 disabled:from-orange-400 disabled:to-amber-400 font-semibold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        {isFetchingSeller ? 'Connecting...' : 'I want this'}
                      </button>
                    )
                  ) : (
                    <button disabled className="w-full py-2.5 bg-gray-100 text-gray-400 font-semibold rounded-lg cursor-not-allowed">
                      Your Listing
                    </button>
                  )}
                </div>
              </motion.div>
              );
            })}
          </div>
      )}
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
