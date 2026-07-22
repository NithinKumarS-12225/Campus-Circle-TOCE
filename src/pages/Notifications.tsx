import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Check, X, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interests, setInterests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch interests where the user is the seller
    const qInterests = query(
      collection(db, 'interests'),
      where('sellerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeInterests = onSnapshot(qInterests, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInterests(items);
    });

    // Fetch notifications for the user
    const qNotifications = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(items);
      setLoading(false);
    });

    return () => {
      unsubscribeInterests();
      unsubscribeNotifications();
    };
  }, [user]);

  const handleUpdateStatus = async (interestId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'interests', interestId), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating interest status:", error);
      alert('Failed to update status.');
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Alerts & Interests</h1>
        
        {loading ? (
          <div className="text-center py-10">Loading alerts...</div>
        ) : (
          <div className="space-y-8">
            {/* Notifications Section */}
            {notifications.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600" /> Waitlist Alerts
                </h2>
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`p-4 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${notification.read ? 'bg-gray-50' : 'bg-orange-50 border-orange-200'}`}
                  >
                    <div>
                      <p className={`text-gray-800 ${notification.read ? '' : 'font-medium'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          handleMarkAsRead(notification.id);
                          navigate('/');
                        }}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                      >
                        View Item
                      </button>
                      {!notification.read && (
                        <button 
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Interests Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700">Buyer Interests</h2>
              {interests.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg border text-gray-500">
                  No one has expressed interest in your items yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {interests.map(interest => (
                    <div key={interest.id} className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-gray-800">
                          <span className="font-semibold text-orange-600">{interest.buyerName}</span> ({interest.buyerYear}, {interest.buyerBranch}) 
                          wants to buy your <span className="font-semibold">"{interest.listingTitle}"</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(interest.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {interest.status === 'pending' ? (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(interest.id, 'accepted')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-sm font-medium transition-colors"
                            >
                              <Check className="w-4 h-4" /> Accept
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(interest.id, 'rejected')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-sm font-medium transition-colors"
                            >
                              <X className="w-4 h-4" /> Reject
                            </button>
                          </>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            interest.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {interest.status.charAt(0).toUpperCase() + interest.status.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
