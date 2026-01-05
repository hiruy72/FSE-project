import React, { useState } from 'react';
import { ratingAPI } from '../services/api';
import { useAuth } from '../context/AuthContextNew';
import { Star, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const RatingModal = ({ isOpen, onClose, session, onRatingSubmitted, mandatory = false }) => {
  const { getIdToken } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  // Debug session data
  React.useEffect(() => {
    if (isOpen) {
      console.log('RatingModal opened with session:', session);
    }
  }, [isOpen, session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Rating submission started:', { rating, feedback, session });
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!session?.id || !session?.mentorId) {
      console.error('Missing session data:', session);
      toast.error('Session information is missing. Please try again.');
      return;
    }

    setLoading(true);
    try {
      console.log('Getting token...');
      const token = await getIdToken();
      console.log('Token received:', token ? 'Present' : 'Missing');
      
      const ratingData = {
        sessionId: session.id,
        mentorId: session.mentorId,
        rating,
        feedback
      };
      
      console.log('Submitting rating with data:', ratingData);
      
      const response = await ratingAPI.submitRating(ratingData, token);
      
      console.log('Rating submission response:', response.data);
      toast.success('Rating submitted successfully!');
      onRatingSubmitted(response.data.rating);
      onClose();
      
      // Reset form
      setRating(0);
      setHoverRating(0);
      setFeedback('');
    } catch (error) {
      console.error('Error submitting rating:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to submit rating');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (mandatory && rating === 0) {
      toast.error('Rating is required to complete the session');
      return;
    }
    
    setRating(0);
    setHoverRating(0);
    setFeedback('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg max-w-md w-full p-6 border border-dark-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {mandatory ? 'Rate Your Session (Required)' : 'Rate Your Session'}
          </h2>
          {!mandatory && (
            <button
              onClick={handleClose}
              className="p-2 text-dark-400 hover:text-white transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Rating Stars */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-3">
              How was your mentoring session?
            </label>
            {mandatory && (
              <div className="mb-3 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  ⚠️ Rating is required to complete your session. Please rate your experience before continuing.
                </p>
              </div>
            )}
            <div className="flex items-center justify-center space-x-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform duration-200 hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-dark-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-center">
              <span className="text-sm text-dark-400">
                {rating === 0 && 'Click to rate'}
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </span>
            </div>
          </div>

          {/* Feedback */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              Share your experience (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="input-field w-full resize-none"
              placeholder="Tell others about your experience with this mentor..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            {!mandatory && (
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={rating === 0 || loading}
              className={`${mandatory ? 'w-full' : 'flex-1'} btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
            >
              {loading ? (
                <div className="loading-spinner w-4 h-4"></div>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{mandatory ? 'Submit Rating to Complete' : 'Submit Rating'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RatingModal;