import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { apiService } from '@/services';
import toast from 'react-hot-toast';

interface FavoriteButtonProps {
  documentId: string;
  initialIsFavorite?: boolean;
  className?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  documentId, 
  initialIsFavorite = false,
  className = ""
}) => {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isPending, setIsPending] = useState(false);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isPending) return;

    setIsPending(true);
    try {
      if (isFavorite) {
        const response = await apiService.removeFromFavorites(documentId);
        if (response.success) {
          setIsFavorite(false);
          toast.success('Removed from bookmarks');
        } else {
          toast.error(response.error?.message || 'Failed to remove favorite');
        }
      } else {
        const response = await apiService.addToFavorites(documentId);
        if (response.success) {
          setIsFavorite(true);
          toast.success('Added to bookmarks');
        } else {
          toast.error(response.error?.message || 'Failed to add favorite');
        }
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={isPending}
      className={`p-2 rounded-full transition-all duration-200 ${
        isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      title={isFavorite ? "Remove from bookmarks" : "Add to bookmarks"}
    >
      <Star className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
    </button>
  );
};
