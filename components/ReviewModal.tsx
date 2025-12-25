
import React, { useState } from 'react';
import { Star, X } from 'lucide-react';

interface ReviewModalProps {
  orderId: string;
  driverName: string;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ orderId, driverName, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    onSubmit(rating, feedback);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        
        <div className="p-8 text-center">
           <h3 className="text-xl font-bold text-gray-800 mb-1">Avaliar Entrega</h3>
           <p className="text-sm text-gray-500 mb-6">Como foi o serviço de <strong>{driverName}</strong>?</p>
           
           <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star 
                    size={32} 
                    className={`${(hoveredStar || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-300'}`} 
                  />
                </button>
              ))}
           </div>

           <form onSubmit={handleSubmit}>
             <textarea
               className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 ring-blue-500 outline-none resize-none mb-4"
               rows={3}
               placeholder="Deixe um comentário (opcional)..."
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
             />
             
             <button 
                type="submit" 
                disabled={rating === 0}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
             >
                Enviar Avaliação
             </button>
           </form>
        </div>
      </div>
    </div>
  );
};
