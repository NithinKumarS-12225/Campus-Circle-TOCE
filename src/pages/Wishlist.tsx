import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'wishlist'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWishlistItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const removeFromWishlist = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'wishlist', id));
    } catch (error) {
      console.error("Error removing from wishlist:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          My Wishlist
        </h1>
        <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-bold">
          {wishlistItems.length} Items Saved
        </span>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center shadow-sm border border-gray-100 space-y-6">
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-12 h-12 text-orange-200" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Your wishlist is empty</h2>
            <p className="text-gray-500">Save items you're interested in to keep track of them!</p>
          </div>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
          >
            Browse Marketplace <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {wishlistItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 flex group hover:shadow-xl transition-all"
              >
                <div className="w-32 h-32 shrink-0 relative">
                  {item.listingImageUrl ? (
                    <img 
                      src={item.listingImageUrl} 
                      alt={item.listingTitle} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-gray-200" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                      {item.listingTitle}
                    </h3>
                    <p className="text-lg font-black text-orange-600 mt-1">₹{item.listingPrice}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => navigate(`/listing/${item.listingId}`)}
                      className="text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors flex items-center gap-1"
                    >
                      View Details <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
