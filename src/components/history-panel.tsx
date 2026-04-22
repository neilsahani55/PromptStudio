import React, { useState } from 'react';
import { Trash2, Star, Copy, Check, Search, SlidersHorizontal, Tag, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { HistoryItem, HistorySortBy, HistoryFilterBy } from '@/hooks/use-history';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onAddTag?: (id: string, tag: string) => void;
  onRemoveTag?: (id: string, tag: string) => void;
  onClearAll?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: HistorySortBy;
  onSortChange: (sort: HistorySortBy) => void;
  filterBy: HistoryFilterBy;
  onFilterChange: (filter: HistoryFilterBy) => void;
  allImageTypes: string[];
  totalCount: number;
}

export function HistoryPanel({
  history,
  onSelect,
  onDelete,
  onToggleFavorite,
  onRename,
  onAddTag,
  onRemoveTag,
  onClearAll,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
  allImageTypes,
  totalCount,
}: HistoryPanelProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [tagInputId, setTagInputId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Prompt copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startRename = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditTitle(item.title || '');
  };

  const commitRename = (id: string) => {
    if (onRename && editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleAddTag = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    if ('stopPropagation' in e) e.stopPropagation();
    if (onAddTag && tagInput.trim()) {
      onAddTag(id, tagInput.trim());
      setTagInput('');
      setTagInputId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as HistorySortBy)}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
              <SlidersHorizontal className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="score_high">Best score</SelectItem>
              <SelectItem value="score_low">Lowest score</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterBy} onValueChange={(v) => onFilterChange(v as HistoryFilterBy)}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
              <SelectValue placeholder="Filter..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="favorites">Favorites</SelectItem>
              {allImageTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground ml-auto">
            {history.length}{history.length !== totalCount ? ` of ${totalCount}` : ''} items
          </span>

          {onClearAll && totalCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm('Clear all history? This cannot be undone.')) {
                  onClearAll();
                }
              }}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{searchQuery || filterBy !== 'all' ? 'No matching items found.' : 'No history yet. Generate some prompts to see them here!'}</p>
        </div>
      ) : (
        <ScrollArea className="h-[550px] pr-4">
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => onSelect(item)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(item.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={() => commitRename(item.id)}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <h4 className="font-semibold truncate pr-2 flex items-center gap-1">
                        {item.title || "Untitled Prompt"}
                        {onRename && (
                          <button
                            onClick={(e) => startRename(e, item)}
                            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </h4>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] h-5">
                        {item.imageType.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                      </span>
                      {item.qualityScore > 0 && (
                        <span className="text-xs font-medium text-green-600">
                          Score: {item.qualityScore}/10
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                    >
                      <Star className={item.favorite ? "fill-current" : ""} size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.input}
                </p>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {item.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-5 gap-1 pl-1.5">
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                      {onRemoveTag && (
                        <button onClick={() => onRemoveTag(item.id, tag)} className="ml-0.5 hover:text-destructive">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </Badge>
                  ))}
                  {onAddTag && (
                    tagInputId === item.id ? (
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTag(e, item.id);
                          if (e.key === 'Escape') { setTagInputId(null); setTagInput(''); }
                        }}
                        onBlur={() => { setTagInputId(null); setTagInput(''); }}
                        placeholder="tag name"
                        className="h-5 w-20 text-[10px] px-1.5"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setTagInputId(item.id); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                      >
                        <Tag className="w-2.5 h-2.5" /> +tag
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center justify-end mt-1 pt-2 border-t border-border/50">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs ml-auto"
                    onClick={(e) => {
                      let promptText = "";
                      if (item.result.type === 'text') {
                        promptText = item.result.data.masterPrompt || item.result.data.imagePrompt || "";
                      } else if (item.result.type === 'image-screenshot') {
                        promptText = item.result.data.masterPrompt || item.result.data.newImagePrompt || "";
                      }
                      handleCopy(e, promptText, item.id);
                    }}
                  >
                    {copiedId === item.id ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                    {copiedId === item.id ? "Copied" : "Copy Prompt"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
