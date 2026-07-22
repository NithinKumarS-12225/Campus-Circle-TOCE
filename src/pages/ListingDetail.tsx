import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc, updateDoc, increment, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChevronLeft, 
  ChevronRight,
  Package, 
  ShieldCheck, 
  Clock, 
  MessageCircle, 
  Phone, 
  Zap, 
  Flame, 
  BadgeCheck, 
  ArrowRight,
  Share2,
  Heart,
  Info,
  Star,
  Send
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { getSimilarSearchQuery } from '../services/geminiService';
import { deleteDoc, onSnapshot as onSnapshotFirestore } from 'firebase/firestore';
import ProductAIChat from '../components/ProductAIChat';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, dbUser } = useAuth();
  
  const [listing, setListing] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [similarListings, setSimilarListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isContacting, setIsContacting] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistDocId, setWishlistDocId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const images = listing?.imageUrls || (listing?.imageUrl ? [listing.imageUrl] : []);

  useEffect(() => {
    if (!id) return;
    
    const fetchListing = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'listings', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          setListing(data);
          
          // Fetch seller
          const sellerSnap = await getDoc(doc(db, 'users', data.sellerId));
          if (sellerSnap.exists()) {
            setSeller(sellerSnap.data());
          }
          
          // Fetch similar listings using Gemini for keywords
          fetchSimilar(data);
          
          // Check if wishlisted
          if (user) {
            const wishlistQ = query(
              collection(db, 'wishlist'),
              where('userId', '==', user.uid),
              where('listingId', '==', data.id)
            );
            const wishlistSnap = await getDocs(wishlistQ);
            if (!wishlistSnap.empty) {
              setIsWishlisted(true);
              setWishlistDocId(wishlistSnap.docs[0].id);
            }
          }

          // Fetch ratings
          const ratingsQ = query(
            collection(db, 'ratings'),
            where('listingId', '==', data.id),
            orderBy('createdAt', 'desc')
          );
          onSnapshotFirestore(ratingsQ, (snapshot) => {
            setRatings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          });
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching listing:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const fetchSimilar = async (currentListing: any) => {
    try {
      // Get keywords from Gemini
      const keywords = await getSimilarSearchQuery(currentListing.title, currentListing.description);
      
      // Search Firestore
      const listingsRef = collection(db, 'listings');
      const q = query(
        listingsRef,
        where('category', '==', currentListing.category),
        where('status', '==', 'available'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.id !== currentListing.id)
        .slice(0, 4);
        
      setSimilarListings(items);
    } catch (error) {
      console.error("Error fetching similar listings:", error);
    }
  };

  const handleContact = async () => {
    if (!user || !dbUser || !listing) return;
    
    setIsContacting(true);
    try {
      await addDoc(collection(db, 'interests'), {
        listingId: listing.id,
        listingTitle: listing.title,
        buyerId: user.uid,
        buyerName: dbUser.name,
        sellerId: listing.sellerId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: listing.sellerId,
        message: `${dbUser.name} is interested in buying your item: ${listing.title}`,
        listingId: listing.id,
        read: false,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'listings', listing.id), {
        interestCount: increment(1)
      });

      setShowContactInfo(true);
    } catch (error) {
      console.error("Error contacting seller:", error);
    } finally {
      setIsContacting(false);
    }
  };

  const handleStartChat = async () => {
    if (!user || !dbUser || !listing) return;
    
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
    }
  };

  const toggleWishlist = async () => {
    if (!user || !listing) return;

    try {
      if (isWishlisted && wishlistDocId) {
        await deleteDoc(doc(db, 'wishlist', wishlistDocId));
        setIsWishlisted(false);
        setWishlistDocId(null);
      } else {
        const newWishlistDoc = await addDoc(collection(db, 'wishlist'), {
          userId: user.uid,
          listingId: listing.id,
          listingTitle: listing.title,
          listingPrice: listing.price,
          listingImageUrl: images[0] || '',
          createdAt: new Date().toISOString()
        });
        setIsWishlisted(true);
        setWishlistDocId(newWishlistDoc.id);
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
    }
  };

  const submitRating = async () => {
    if (!user || !dbUser || !listing || userRating === 0) return;

    setIsSubmittingRating(true);
    try {
      await addDoc(collection(db, 'ratings'), {
        listingId: listing.id,
        userId: user.uid,
        userName: dbUser.name,
        rating: userRating,
        comment: ratingComment,
        createdAt: new Date().toISOString()
      });
      setUserRating(0);
      setRatingComment('');
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-8 animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-200 rounded-3xl"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded-lg w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded-lg w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Navigation */}
      <button 
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors group"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to Marketplace
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative group">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-[4/3] bg-gray-100 rounded-[32px] overflow-hidden shadow-xl border-4 border-white relative"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentImageIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100) {
                      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                    } else if (info.offset.x < -100) {
                      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                    }
                  }}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                >
                  {images.length > 0 ? (
                    <img 
                      src={images[currentImageIndex]} 
                      alt={`${listing.title} - ${currentImageIndex + 1}`} 
                      className="w-full h-full object-cover pointer-events-none" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-24 h-24 text-gray-200" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              
              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-md rounded-full text-gray-800 shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-md rounded-full text-gray-800 shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-6 left-6 flex flex-col gap-2">
                <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold shadow-lg text-gray-700 border border-white">
                  {listing.condition} Condition
                </span>
                {listing.isBundle && (
                  <span className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                    <Package className="w-3.5 h-3.5" /> Bundle Deal
                  </span>
                )}
              </div>

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/20">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </motion.div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                    currentImageIndex === idx ? 'border-orange-500 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}

          {/* Description Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-500" /> Item Description
            </h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Category</p>
                <p className="font-bold text-gray-800 capitalize">{listing.category}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Posted</p>
                <p className="font-bold text-gray-800">{formatDistanceToNow(new Date(listing.createdAt))} ago</p>
              </div>
            </div>
          </div>

          {/* Ratings Section */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Product Ratings
              </h2>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-black text-gray-900">
                  {ratings.length > 0 ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1) : '0.0'}
                </span>
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs text-gray-400 font-medium ml-1">({ratings.length} reviews)</span>
              </div>
            </div>

            {/* Add Rating */}
            {user && user.uid !== listing.sellerId && (
              <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100">
                <p className="text-sm font-bold text-gray-700">Rate this product</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setUserRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={`w-8 h-8 ${userRating >= star ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Share your experience with this item..."
                    className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none min-h-[100px] resize-none"
                  />
                  <button
                    onClick={submitRating}
                    disabled={isSubmittingRating || userRating === 0}
                    className="absolute bottom-4 right-4 bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Ratings List */}
            <div className="space-y-6">
              {ratings.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4 italic">No ratings yet. Be the first to rate!</p>
              ) : (
                ratings.map((rating) => (
                  <div key={rating.id} className="border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-[10px] font-bold text-orange-600">
                          {rating.userName[0]}
                        </div>
                        <span className="text-sm font-bold text-gray-800">{rating.userName}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {formatDistanceToNow(new Date(rating.createdAt))} ago
                      </span>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${rating.rating >= s ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{rating.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Seller */}
        <div className="lg:col-span-5 space-y-6">
          {/* Price & Primary Action */}
          <div className="bg-white rounded-[32px] p-8 shadow-xl border border-gray-100 sticky top-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">{listing.title}</h1>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-orange-600">₹{listing.price}</span>
                  {listing.originalPrice && (
                    <span className="text-lg text-gray-400 line-through">₹{listing.originalPrice}</span>
                  )}
                  {ratings.length > 0 && (
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-xs font-bold border border-amber-100 ml-2">
                      <Star className="w-3 h-3 fill-amber-500" />
                      {(ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={toggleWishlist}
                className={`p-3 rounded-2xl transition-all ${isWishlisted ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500'}`}
              >
                <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-red-500' : ''}`} />
              </button>
            </div>

            {/* Demand Indicator */}
            {listing.interestCount > 0 && (
              <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 ${listing.interestCount >= 3 ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {listing.interestCount >= 3 ? <Zap className="w-5 h-5 fill-orange-500" /> : <Flame className="w-5 h-5 fill-red-500" />}
                <p className="text-sm font-bold">
                  {listing.interestCount >= 3 ? 'High demand! Multiple students are looking at this.' : `${listing.interestCount} students have expressed interest.`}
                </p>
              </div>
            )}

            {listing.sellerId === user?.uid ? (
              <button disabled className="w-full py-4 bg-gray-100 text-gray-400 font-bold rounded-2xl cursor-not-allowed">
                This is your listing
              </button>
            ) : showContactInfo ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button 
                    onClick={handleStartChat}
                    className="flex-1 py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" /> Open Chat
                  </button>
                  {seller?.phoneNumber && (
                    <a 
                      href={`tel:${seller.phoneNumber}`}
                      className="flex-1 py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                    >
                      <Phone className="w-5 h-5" /> Call Seller
                    </a>
                  )}
                </div>
                <p className="text-center text-xs text-gray-400">
                  You've successfully contacted the seller.
                </p>
              </div>
            ) : (
              <button 
                onClick={handleContact}
                disabled={isContacting}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-2xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2"
              >
                {isContacting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>I'm Interested <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            )}

            {/* Seller Info */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 font-bold text-xl">
                  {listing.sellerName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-gray-900">{listing.sellerName}</h3>
                    {listing.sellerTrustScore >= 3 && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{listing.sellerBranch} • {listing.sellerYear}</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-orange-100">
                    ⭐ {listing.sellerTrustScore || 0} Deals
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span>Verified student at your university</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Items Section */}
      {similarListings.length > 0 && (
        <div className="mt-16 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">You May Also Like / Similar Items</h2>
            <button 
              onClick={() => navigate('/')}
              className="text-orange-600 font-bold text-sm hover:underline"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similarListings.map(item => (
              <motion.div
                key={item.id}
                whileHover={{ y: -8 }}
                onClick={() => {
                  navigate(`/listing/${item.id}`);
                  window.scrollTo(0, 0);
                }}
                className="bg-white rounded-[32px] border border-gray-100 p-4 shadow-sm hover:shadow-2xl transition-all cursor-pointer group relative"
              >
                <div className="aspect-[4/3] bg-gray-50 rounded-2xl overflow-hidden mb-4 relative">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-200" />
                    </div>
                  )}
                  
                  {/* Recommended Badge */}
                  <div className="absolute top-0 right-0">
                    <div className="bg-orange-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-lg">
                      Recommended
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">{item.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-orange-600">₹{item.price}</span>
                    <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-lg text-[10px] font-bold border border-gray-100">
                      {item.condition}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* AI Assistant */}
      <ProductAIChat product={listing} />
    </div>
  );
}

function Loader2(props: any) {
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
