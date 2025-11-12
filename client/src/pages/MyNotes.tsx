import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Search, BookOpen, Calendar, Trash2, Sparkles, ArrowLeft, Plus, Edit, Loader2, Tag, Brain, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';

interface NoteTag {
  id: number;
  name: string;
  type: 'subject' | 'topic' | 'subTopic';
}

interface Note {
  id: number;
  userId: number;
  content: string;
  headline?: string;
  questionId?: number;
  subject?: string;
  topic?: string;
  createdAt: string;
  updatedAt: string;
  tags?: NoteTag[];
}

interface QuizQuestion {
  id: number;
  noteId: number;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

export function MyNotes() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [isEditTagDialogOpen, setIsEditTagDialogOpen] = useState(false);
  const [isAddTagDialogOpen, setIsAddTagDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [quizNote, setQuizNote] = useState<Note | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [noteContent, setNoteContent] = useState('');
  const [editingTag, setEditingTag] = useState<NoteTag | null>(null);
  const [editingTagNote, setEditingTagNote] = useState<Note | null>(null);
  const [addingTagNote, setAddingTagNote] = useState<Note | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagType, setTagType] = useState<'subject' | 'topic' | 'subTopic'>('topic');
  const [isManagingTag, setIsManagingTag] = useState(false);
  
  // Multi-tag search state
  const [selectedSearchTags, setSelectedSearchTags] = useState<NoteTag[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [viewingNoteId, setViewingNoteId] = useState<number | null>(null);
  
  // Sidebar navigation state
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNotes();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.tag-search-container')) {
        setIsTagDropdownOpen(false);
      }
    };

    if (isTagDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTagDropdownOpen]);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notes', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }

      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Please enter some content for your note');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          highlightedText: noteContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      const data = await response.json();
      const newNote = data.note || data;
      setNotes([newNote, ...notes]);
      setNoteContent('');
      setIsCreateDialogOpen(false);
      toast.success('Note created successfully!');
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;

    if (!noteContent.trim()) {
      toast.error('Please enter some content for your note');
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: noteContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      const data = await response.json();
      const updatedNote = data.note || data;
      setNotes(notes.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
      setEditingNote(null);
      setNoteContent('');
      setIsEditDialogOpen(false);
      toast.success('Note updated successfully!');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deletingNote) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/notes/${deletingNote.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      setNotes(notes.filter((n) => n.id !== deletingNote.id));
      setDeletingNote(null);
      setIsDeleteDialogOpen(false);
      toast.success('Note deleted successfully!');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateTags = async (noteId: number) => {
    try {
      setIsGeneratingTags(true);
      toast.info('AI is generating tags...');
      
      const response = await fetch(`/api/notes/${noteId}/generate-tags`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate tags');
      }

      const data = await response.json();
      
      // Update the note with tags
      setNotes(notes.map((n) => 
        n.id === noteId ? { ...n, tags: data.tags } : n
      ));
      
      toast.success(`Generated ${data.tags.length} tags!`);
    } catch (error) {
      console.error('Error generating tags:', error);
      toast.error('Failed to generate tags. Please try again.');
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleGenerateQuiz = async (note: Note) => {
    try {
      setIsGeneratingQuiz(true);
      setQuizNote(note);
      toast.info('AI is generating quiz questions...');
      
      const response = await fetch(`/api/notes/${note.id}/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ numQuestions: 5 }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      const data = await response.json();
      setQuizQuestions(data.questions);
      setIsQuizDialogOpen(true);
      toast.success(`Generated ${data.questions.length} quiz questions!`);
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Failed to generate quiz. Please try again.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (note: Note) => {
    setDeletingNote(note);
    setIsDeleteDialogOpen(true);
  };

  const openEditTagDialog = (tag: NoteTag, note: Note) => {
    setEditingTag(tag);
    setEditingTagNote(note);
    setTagName(tag.name);
    setTagType(tag.type);
    setIsEditTagDialogOpen(true);
  };

  const openAddTagDialog = (note: Note) => {
    setAddingTagNote(note);
    setTagName('');
    setTagType('topic');
    setIsAddTagDialogOpen(true);
  };

  const handleDeleteTag = async (noteId: number, tagId: number) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/tags/${tagId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      // Update the note by removing the tag
      setNotes(notes.map((n) => 
        n.id === noteId 
          ? { ...n, tags: n.tags?.filter(t => t.id !== tagId) }
          : n
      ));
      
      toast.success('Tag removed successfully!');
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Failed to delete tag. Please try again.');
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !editingTagNote) return;

    if (!tagName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    try {
      setIsManagingTag(true);
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: tagName.trim(),
          type: tagType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tag');
      }

      const data = await response.json();
      
      // Update all notes that have this tag
      setNotes(notes.map((n) => ({
        ...n,
        tags: n.tags?.map(t => t.id === editingTag.id ? data.tag : t)
      })));
      
      setIsEditTagDialogOpen(false);
      toast.success('Tag updated successfully!');
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('Failed to update tag. Please try again.');
    } finally {
      setIsManagingTag(false);
    }
  };

  const handleAddTag = async () => {
    if (!addingTagNote) return;

    if (!tagName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    try {
      setIsManagingTag(true);
      const response = await fetch(`/api/notes/${addingTagNote.id}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: tagName.trim(),
          type: tagType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add tag');
      }

      const data = await response.json();
      
      // Update the note with the new tag
      setNotes(notes.map((n) => 
        n.id === addingTagNote.id
          ? { ...n, tags: [...(n.tags || []), data.tag] }
          : n
      ));
      
      setIsAddTagDialogOpen(false);
      toast.success('Tag added successfully!');
    } catch (error: any) {
      console.error('Error adding tag:', error);
      toast.error(error.message || 'Failed to add tag. Please try again.');
    } finally {
      setIsManagingTag(false);
    }
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // Get all unique tags from all notes
  const allUniqueTags = Array.from(
    new Map(notes.flatMap(n => n.tags || []).map(t => [t.id, t])).values()
  );

  // Filter tags for autocomplete
  const filteredTagsForSearch = allUniqueTags.filter(tag =>
    !selectedSearchTags.some(st => st.id === tag.id) &&
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  // Categorize notes based on multi-tag search
  const categorizeNotes = () => {
    if (selectedSearchTags.length === 0) {
      // No tags selected - show all notes with text search
      const filtered = notes.filter((note) => {
        const matchesSearch = stripHtml(note.content).toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
      return { perfectMatches: [], partialMatches: [], allNotes: filtered };
    }

    const perfectMatches: Note[] = [];
    const partialMatches: Array<Note & { matchCount: number; matchedTags: NoteTag[] }> = [];

    for (const note of notes) {
      // Apply text search filter first
      const matchesSearch = stripHtml(note.content).toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) continue;

      const noteTags = note.tags || [];
      const matchedTags = noteTags.filter(tag =>
        selectedSearchTags.some(st => st.id === tag.id)
      );

      if (matchedTags.length === selectedSearchTags.length) {
        // Has ALL selected tags
        perfectMatches.push(note);
      } else if (matchedTags.length > 0) {
        // Has SOME selected tags
        partialMatches.push({
          ...note,
          matchCount: matchedTags.length,
          matchedTags
        });
      }
    }

    // Sort partial matches by match count (descending)
    partialMatches.sort((a, b) => b.matchCount - a.matchCount);

    return { perfectMatches, partialMatches, allNotes: [] };
  };

  const { perfectMatches, partialMatches, allNotes } = categorizeNotes();
  const hasSearchTags = selectedSearchTags.length > 0;

  // Get all unique tags for old filter (backward compatibility)
  const allTags = Array.from(
    new Set(notes.flatMap(n => n.tags || []).map(t => t.name))
  );

  // Handler to add tag to search
  const handleAddSearchTag = (tag: NoteTag) => {
    if (!selectedSearchTags.some(st => st.id === tag.id)) {
      setSelectedSearchTags([...selectedSearchTags, tag]);
    }
    setTagSearchQuery('');
    setIsTagDropdownOpen(false);
  };

  // Handler to remove tag from search
  const handleRemoveSearchTag = (tagId: number) => {
    setSelectedSearchTags(selectedSearchTags.filter(t => t.id !== tagId));
  };

  // Handler to clear all search tags
  const handleClearSearchTags = () => {
    setSelectedSearchTags([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation('/child')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Dashboard</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">My Smart Notes</h1>
            </div>
            <Button
              onClick={() => {
                setNoteContent('');
                setIsCreateDialogOpen(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Note
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search your notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          
          {/* Multi-Tag Search */}
          {allUniqueTags.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-gray-700">Search by Tags:</span>
              </div>
              
              {/* Autocomplete Tag Selector */}
              <div className="relative tag-search-container">
                <Input
                  type="text"
                  placeholder="Type to search tags..."
                  value={tagSearchQuery}
                  onChange={(e) => {
                    setTagSearchQuery(e.target.value);
                    setIsTagDropdownOpen(true);
                  }}
                  onFocus={() => setIsTagDropdownOpen(true)}
                  className="h-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
                
                {/* Dropdown */}
                {isTagDropdownOpen && filteredTagsForSearch.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredTagsForSearch.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleAddSearchTag(tag)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              tag.type === 'subject'
                                ? 'bg-blue-100 text-blue-700'
                                : tag.type === 'topic'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {tag.name}
                          </span>
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {tag.type === 'subTopic' ? 'Sub-Topic' : tag.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Selected Tags */}
              {selectedSearchTags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Selected Tags:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearchTags}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSearchTags.map((tag) => (
                      <span
                        key={tag.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                          tag.type === 'subject'
                            ? 'bg-blue-500 text-white'
                            : tag.type === 'topic'
                            ? 'bg-green-500 text-white'
                            : 'bg-purple-500 text-white'
                        }`}
                      >
                        {tag.name}
                        <button
                          onClick={() => handleRemoveSearchTag(tag.id)}
                          className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-600 text-lg">Loading your notes...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !hasSearchTags && allNotes.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen className="w-20 h-20 text-gray-300 mb-4" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No notes yet</h3>
            <p className="text-gray-500 mb-6">Start creating notes to organize your learning!</p>
            <Button
              onClick={() => {
                setNoteContent('');
                setIsCreateDialogOpen(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Note
            </Button>
          </div>
        )}

        {/* No Search Results */}
        {!isLoading && hasSearchTags && perfectMatches.length === 0 && partialMatches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Search className="w-20 h-20 text-gray-300 mb-4" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No notes found</h3>
            <p className="text-gray-500 mb-6">Try searching with different keywords or clear filters</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                handleClearSearchTags();
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Perfect Matches Section */}
        {!isLoading && hasSearchTags && perfectMatches.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400 rounded-lg">
                <span className="text-2xl">⭐</span>
                <h2 className="text-xl font-bold text-gray-900">Perfect Matches</h2>
                <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-white text-sm font-semibold rounded-full">
                  {perfectMatches.length}
                </span>
              </div>
              <p className="text-sm text-gray-600">Notes with ALL selected tags</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {perfectMatches.map((note) => (
                <Card key={note.id} className="hover:shadow-xl transition-all border-4 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                      <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
                        ALL TAGS
                      </span>
                    </div>

                    {/* Note Content */}
                    <div 
                      className="text-gray-700 mb-4 line-clamp-6 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {note.tags && note.tags.length > 0 && note.tags.map((tag) => (
                        <div
                          key={tag.id}
                          className={`group relative flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            tag.type === 'subject'
                              ? 'bg-blue-100 text-blue-700'
                              : tag.type === 'topic'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          <span 
                            onClick={() => openEditTagDialog(tag, note)}
                            className="cursor-pointer hover:underline"
                          >
                            {tag.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTag(note.id, tag.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 rounded-full p-0.5"
                            title="Remove tag"
                          >
                            <X className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => openAddTagDialog(note)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Tag
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(note)}
                        className="w-full"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(note)}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateTags(note.id)}
                        disabled={isGeneratingTags}
                        className="w-full"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Tags
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateQuiz(note.id)}
                        disabled={isGeneratingQuiz}
                        className="w-full"
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        AI Quiz
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Partial Matches Section */}
        {!isLoading && hasSearchTags && partialMatches.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-lg">
                <span className="text-2xl">📋</span>
                <h2 className="text-xl font-bold text-gray-900">Partial Matches</h2>
                <span className="ml-2 px-2 py-0.5 bg-gray-500 text-white text-sm font-semibold rounded-full">
                  {partialMatches.length}
                </span>
              </div>
              <p className="text-sm text-gray-600">Notes with SOME selected tags</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {partialMatches.map((note) => (
                <Card key={note.id} className="hover:shadow-lg transition-shadow border-2 border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                      <span className="px-2 py-1 bg-gray-500 text-white text-xs font-semibold rounded-full">
                        {note.matchCount}/{selectedSearchTags.length} tags
                      </span>
                    </div>

                    {/* Note Content */}
                    <div 
                      className="text-gray-700 mb-4 line-clamp-6 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {note.tags && note.tags.length > 0 && note.tags.map((tag) => {
                        const isMatched = note.matchedTags.some(mt => mt.id === tag.id);
                        return (
                          <div
                            key={tag.id}
                            className={`group relative flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              isMatched
                                ? tag.type === 'subject'
                                  ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                                  : tag.type === 'topic'
                                  ? 'bg-green-500 text-white ring-2 ring-green-300'
                                  : 'bg-purple-500 text-white ring-2 ring-purple-300'
                                : tag.type === 'subject'
                                ? 'bg-blue-100 text-blue-700'
                                : tag.type === 'topic'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            <span 
                              onClick={() => openEditTagDialog(tag, note)}
                              className="cursor-pointer hover:underline"
                            >
                              {tag.name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTag(note.id, tag.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 rounded-full p-0.5"
                              title="Remove tag"
                            >
                              <X className="w-3 h-3 text-red-600" />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => openAddTagDialog(note)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Tag
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(note)}
                        className="w-full"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(note)}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateTags(note.id)}
                        disabled={isGeneratingTags}
                        className="w-full"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Tags
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateQuiz(note.id)}
                        disabled={isGeneratingQuiz}
                        className="w-full"
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        AI Quiz
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Notes (when no search tags) */}
        {!isLoading && !hasSearchTags && allNotes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allNotes.map((note) => {
              const isExpanded = expandedNoteId === note.id;
              return (
              <Card 
                key={note.id} 
                className="hover:shadow-lg transition-all border-2 border-gray-100 cursor-pointer"
                onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
              >
                <CardContent className="p-4">
                  {/* Headline */}
                  {note.headline && (
                    <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2">
                      {note.headline}
                    </h3>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Note Content - Compact or Expanded */}
                  <div 
                    className={`text-gray-700 mb-3 prose prose-sm max-w-none ${
                      isExpanded ? '' : 'line-clamp-2'
                    }`}
                    dangerouslySetInnerHTML={{ __html: note.content }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  {!isExpanded && (
                    <button 
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedNoteId(note.id);
                      }}
                    >
                      Read more →
                    </button>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {note.tags && note.tags.length > 0 && note.tags.map((tag) => (
                      <div
                        key={tag.id}
                        className={`group relative flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          tag.type === 'subject'
                            ? 'bg-blue-100 text-blue-700'
                            : tag.type === 'topic'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        <span 
                          onClick={() => openEditTagDialog(tag, note)}
                          className="cursor-pointer hover:underline"
                        >
                          {tag.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTag(note.id, tag.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                          title="Remove tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => openAddTagDialog(note)}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      title="Add tag"
                    >
                      <Plus className="w-3 h-3" />
                      Add Tag
                    </button>
                  </div>

                  {/* Action Buttons - Only show when expanded */}
                  {isExpanded && (
                    <div className="space-y-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={(e) => { e.stopPropagation(); openEditDialog(note); }}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={(e) => { e.stopPropagation(); openDeleteDialog(note); }}
                          variant="outline"
                          size="sm"
                          className="text-xs text-red-600"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleGenerateTags(note.id); }}
                          disabled={isGeneratingTags}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          {isGeneratingTags ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 mr-1" />
                          )}
                          AI Tags
                        </Button>
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleGenerateQuiz(note); }}
                          disabled={isGeneratingQuiz}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          {isGeneratingQuiz ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Brain className="w-3 h-3 mr-1" />
                          )}
                          AI Quiz
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </div>

      {/* Create Note Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Create New Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RichTextEditor
              content={noteContent}
              onChange={setNoteContent}
              placeholder="Write your note here... Use the toolbar to format your text!"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNoteContent('');
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNote}
              disabled={isCreating || !noteContent.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Note
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Edit className="w-6 h-6 text-blue-600" />
              Edit Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RichTextEditor
              content={noteContent}
              onChange={setNoteContent}
              placeholder="Write your note here... Use the toolbar to format your text!"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingNote(null);
                setNoteContent('');
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateNote}
              disabled={isUpdating || !noteContent.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Note
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete this note? This action cannot be undone.
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div 
                  className="text-sm text-gray-700 line-clamp-3 prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: deletingNote?.content || '' }}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Tag Dialog */}
      <Dialog open={isEditTagDialogOpen} onOpenChange={setIsEditTagDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Tag className="w-5 h-5 text-purple-600" />
              Edit Tag
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tag Name
              </label>
              <Input
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="Enter tag name..."
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tag Type
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tagType === 'subject' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagType('subject')}
                  className={tagType === 'subject' ? 'bg-blue-600' : ''}
                >
                  Subject
                </Button>
                <Button
                  type="button"
                  variant={tagType === 'topic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagType('topic')}
                  className={tagType === 'topic' ? 'bg-green-600' : ''}
                >
                  Topic
                </Button>
                <Button
                  type="button"
                  variant={tagType === 'subTopic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagType('subTopic')}
                  className={tagType === 'subTopic' ? 'bg-purple-600' : ''}
                >
                  Sub-Topic
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditTagDialogOpen(false);
                setEditingTag(null);
                setEditingTagNote(null);
              }}
              disabled={isManagingTag}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTag}
              disabled={isManagingTag || !tagName.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isManagingTag ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={isAddTagDialogOpen} onOpenChange={setIsAddTagDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Plus className="w-5 h-5 text-purple-600" />
              Add Tag
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tag Name
              </label>
              <Input
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="Enter tag name..."
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tag Type
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tagType === 'subject' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagType('subject')}
                  className={tagType === 'subject' ? 'bg-blue-600' : ''}
                >
                  Subject
                </Button>
                <Button
                  type="button"
                  variant={tagType === 'topic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagType('topic')}
                  className={tagType === 'topic' ? 'bg-green-600' : ''}
                >
                  Topic
                </Button>
                <Button
                  type="button"
                  variant={tagType === 'subTopic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagType('subTopic')}
                  className={tagType === 'subTopic' ? 'bg-purple-600' : ''}
                >
                  Sub-Topic
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddTagDialogOpen(false);
                setAddingTagNote(null);
              }}
              disabled={isManagingTag}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTag}
              disabled={isManagingTag || !tagName.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isManagingTag ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Tag'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interactive Quiz Dialog */}
      <Dialog open={isQuizDialogOpen} onOpenChange={(open) => {
        setIsQuizDialogOpen(open);
        if (!open) {
          setQuizNote(null);
          setQuizQuestions([]);
          setCurrentQuestionIndex(0);
          setSelectedAnswer(null);
          setAnsweredQuestions(new Set());
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-green-600" />
                AI-Generated Quiz
              </div>
              <span className="text-sm font-normal text-gray-500">
                Question {currentQuestionIndex + 1} of {quizQuestions.length}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {quizQuestions.length > 0 && quizQuestions[currentQuestionIndex] && (
            <div className="py-4">
              {/* Difficulty Badge */}
              {quizQuestions[currentQuestionIndex].difficulty && (
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    quizQuestions[currentQuestionIndex].difficulty === 'easy'
                      ? 'bg-green-100 text-green-700'
                      : quizQuestions[currentQuestionIndex].difficulty === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {quizQuestions[currentQuestionIndex].difficulty?.toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Question */}
              <h3 className="text-lg font-semibold mb-6">
                {quizQuestions[currentQuestionIndex].questionText}
              </h3>
              
              {/* Options */}
              <div className="space-y-3 mb-6">
                {quizQuestions[currentQuestionIndex].options.map((option, optIdx) => {
                  const isSelected = selectedAnswer === optIdx;
                  const isCorrect = optIdx === quizQuestions[currentQuestionIndex].correctAnswerIndex;
                  const showResult = answeredQuestions.has(currentQuestionIndex);
                  
                  return (
                    <button
                      key={optIdx}
                      onClick={() => {
                        if (!showResult) {
                          setSelectedAnswer(optIdx);
                          setAnsweredQuestions(new Set([...answeredQuestions, currentQuestionIndex]));
                        }
                      }}
                      disabled={showResult}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        !showResult
                          ? 'hover:border-blue-400 hover:bg-blue-50 border-gray-200'
                          : showResult && isSelected && isCorrect
                          ? 'bg-green-50 border-green-500'
                          : showResult && isSelected && !isCorrect
                          ? 'bg-red-50 border-red-500'
                          : showResult && isCorrect
                          ? 'bg-green-50 border-green-500'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-700">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span>{option}</span>
                        </div>
                        {showResult && isCorrect && (
                          <span className="text-green-600 font-semibold">✓ Correct</span>
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <span className="text-red-600 font-semibold">✗ Wrong</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Explanation (shown after answering) */}
              {answeredQuestions.has(currentQuestionIndex) && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Explanation:</p>
                  <p className="text-sm text-blue-800">{quizQuestions[currentQuestionIndex].explanation}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(currentQuestionIndex - 1);
                  setSelectedAnswer(null);
                }
              }}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            
            {currentQuestionIndex < quizQuestions.length - 1 ? (
              <Button
                onClick={() => {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                  setSelectedAnswer(null);
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setIsQuizDialogOpen(false);
                  setQuizNote(null);
                  setQuizQuestions([]);
                  setCurrentQuestionIndex(0);
                  setSelectedAnswer(null);
                  setAnsweredQuestions(new Set());
                }}
              >
                Finish
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
