import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New review state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    fetchReviews();

    // Set up real-time subscription
    const channel = supabase
      .channel('public:reviews')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, (payload) => {
        setReviews(current => [payload.new as Review, ...current]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be signed in to leave a review.');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a comment.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a nice display name from email if we don't have a specific profile
      const username = user.email ? user.email.split('@')[0] : 'Student';
      
      const { error } = await supabase.from('reviews').insert([
        {
          user_id: user.id,
          user_name: username,
          rating,
          comment: comment.trim()
        }
      ]);

      if (error) {
        if (error.code === '42P01') {
          toast.error('Database table missing! Please run the SQL command provided.');
        } else {
          throw error;
        }
      } else {
        toast.success('Thank you for your feedback!');
        setComment('');
        setRating(5);
      }
    } catch (error: any) {
      toast.error('Failed to submit review: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative max-w-6xl mx-auto w-full p-8 sm:p-12 mt-8 md:mt-16 animate-in fade-in duration-1000 rounded-3xl bg-gradient-to-br from-[#7000ab]/[0.08] via-[#2563EB]/[0.04] to-[#0c0291]/[0.09] border border-purple-200/60 shadow-sm">
      <div className="text-center mb-12">
        <div className="font-mono text-xs sm:text-sm uppercase tracking-widest text-[#2563EB] mb-4 inline-block bg-white border border-[#DBEAFE] px-5 py-2 rounded-full shadow-xs font-semibold">
          Student Feedback
        </div>
        <h2 className="title-text text-3xl md:text-5xl text-[#0F172A] font-bold">What Our Students Say</h2>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Reviews List */}
        <div className="lg:col-span-8 space-y-6">
          {loading ? (
            <div className="text-center py-12 text-[#64748B] animate-pulse font-medium">Loading Feedback...</div>
          ) : reviews.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm p-8 text-center rounded-2xl border border-dashed border-purple-200">
              <p className="text-[#64748B] font-normal">No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid sm:grid-cols-2 gap-6"
            >
              <AnimatePresence>
                {reviews.map((review, index) => (
                  <motion.div 
                    key={review.id}
                    layout
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      transition: { 
                        type: "spring",
                        stiffness: 100,
                        damping: 15,
                        delay: index * 0.1
                      }
                    }}
                    whileHover={{ 
                      y: -5,
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                    className="bg-white/85 backdrop-blur-md p-6 rounded-2xl flex flex-col items-start gap-4 relative overflow-hidden border border-purple-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-300"
                  >
                    {/* Subtle glow effect behind stars */}
                    <div className="absolute top-6 left-6 w-16 h-16 bg-amber-400/10 blur-2xl rounded-full pointer-events-none" />
                    
                    <div className="flex gap-1 relative z-10">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-4 h-4 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                        />
                      ))}
                    </div>
                    <p className="text-sm text-[#334155] font-normal leading-relaxed flex-1 relative z-10">"{review.comment}"</p>
                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100 w-full relative z-10">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7000ab] to-[#0c0291] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {review.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0F172A] tracking-wide">{review.user_name}</p>
                        <p className="text-[10px] text-[#64748B]">
                          {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Submit Review Form */}
        <div className="lg:col-span-4">
          <div className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-purple-100/80 shadow-sm sticky top-24">
            <h3 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#d946ef] via-[#c026d3] to-[#7000ab] bg-clip-text text-transparent mb-2 inline-block">Leave a Review</h3>
            <p className="text-sm text-[#64748B] mb-6">Share your thoughts to help us improve.</p>
            
            {user ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-wider text-[#475569] font-semibold">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star 
                          className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-200'}`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="comment" className="font-mono text-xs uppercase tracking-wider text-[#475569] font-semibold">Your Feedback</label>
                  <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    placeholder="This platform has totally changed my studying..."
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all min-h-[120px] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#7000ab] to-[#0c0291] text-white hover:opacity-90 rounded-xl font-bold text-sm transition-all duration-300 shadow-md shadow-purple-950/20 disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Post Review'}
                </button>
              </form>
            ) : (
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-6 text-center space-y-4">
                <Star className="w-8 h-8 text-purple-300 mx-auto" />
                <p className="text-sm text-[#64748B]">You must be signed in to share your thoughts.</p>
                <div className="pt-2">
                  <a href="/register" className="font-mono text-xs uppercase tracking-wider bg-gradient-to-r from-[#7000ab] to-[#0c0291] text-white px-5 py-2.5 rounded-full font-bold hover:opacity-90 transition-opacity inline-block shadow-sm">
                    Sign In to Review
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
