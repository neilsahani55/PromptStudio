import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppResult } from '@/lib/types';

export interface HistoryItem {
  id: string;
  timestamp: number;
  input: string;
  result: AppResult;
  qualityScore: number;
  imageType: string;
  favorite: boolean;
  title?: string;
  tags: string[];
}

export type HistorySortBy = 'newest' | 'oldest' | 'score_high' | 'score_low';
export type HistoryFilterBy = 'all' | 'favorites' | string; // string = imageType filter

const STORAGE_KEY = 'promptstudio_history';
const MAX_ITEMS = 100;

// Add polyfill for crypto.randomUUID if not available
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'undefined') {
  (crypto as any).randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<HistorySortBy>('newest');
  const [filterBy, setFilterBy] = useState<HistoryFilterBy>('all');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrate old items without tags field
        const migrated = parsed.map((item: any) => ({
          ...item,
          tags: item.tags || [],
        }));
        setHistory(migrated);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToStorage = useCallback((items: HistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // localStorage quota exceeded — trim older entries and retry
      console.warn('localStorage quota exceeded, trimming history:', e);
      const trimmed = items.slice(0, Math.floor(items.length / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        // If still fails, clear all history
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHistory(items);
  }, []);

  const addToHistory = useCallback((
    input: string,
    result: AppResult,
    imageType: string,
    qualityScore: number = 0
  ) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      input,
      result,
      qualityScore,
      imageType,
      favorite: false,
      title: input.slice(0, 50) + (input.length > 50 ? '...' : ''),
      tags: [],
    };

    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, MAX_ITEMS);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const toggleFavorite = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, favorite: !item.favorite } : item
      );
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const clearHistory = useCallback(() => {
    saveToStorage([]);
  }, [saveToStorage]);

  const deleteItem = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const renameItem = useCallback((id: string, newTitle: string) => {
    setHistory(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, title: newTitle.trim() || item.title } : item
      );
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const addTag = useCallback((id: string, tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (!normalizedTag) return;
    setHistory(prev => {
      const updated = prev.map(item =>
        item.id === id && !item.tags.includes(normalizedTag)
          ? { ...item, tags: [...item.tags, normalizedTag] }
          : item
      );
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const removeTag = useCallback((id: string, tag: string) => {
    setHistory(prev => {
      const updated = prev.map(item =>
        item.id === id
          ? { ...item, tags: item.tags.filter(t => t !== tag) }
          : item
      );
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // All unique tags across history
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    history.forEach(item => item.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [history]);

  // All unique image types for filter dropdown
  const allImageTypes = useMemo(() => {
    const types = new Set<string>();
    history.forEach(item => types.add(item.imageType));
    return Array.from(types).sort();
  }, [history]);

  // Filtered and sorted history
  const filteredHistory = useMemo(() => {
    let items = [...history];

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item =>
        (item.title || '').toLowerCase().includes(q) ||
        item.input.toLowerCase().includes(q) ||
        item.tags.some(t => t.includes(q)) ||
        item.imageType.toLowerCase().includes(q)
      );
    }

    // Apply filter
    if (filterBy === 'favorites') {
      items = items.filter(item => item.favorite);
    } else if (filterBy !== 'all') {
      items = items.filter(item => item.imageType === filterBy);
    }

    // Apply sort
    switch (sortBy) {
      case 'oldest':
        items.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'score_high':
        items.sort((a, b) => b.qualityScore - a.qualityScore);
        break;
      case 'score_low':
        items.sort((a, b) => a.qualityScore - b.qualityScore);
        break;
      case 'newest':
      default:
        items.sort((a, b) => b.timestamp - a.timestamp);
        break;
    }

    return items;
  }, [history, searchQuery, sortBy, filterBy]);

  return {
    history: filteredHistory,
    rawHistory: history,
    addToHistory,
    toggleFavorite,
    clearHistory,
    deleteItem,
    renameItem,
    addTag,
    removeTag,
    allTags,
    allImageTypes,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
  };
}
