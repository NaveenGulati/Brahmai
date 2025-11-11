import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, BookOpen, Calendar, Trash2, Sparkles, ArrowLeft, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';

interface Note {
  id: number;
  userId: number;
  content: string;
  questionId?: number;
  createdAt: string;
  updatedAt: string;
}

export function MyNotes() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState('');

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
  }, []);

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
      toast.error('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const createNote = async () => {
    if (!noteContent || noteContent.trim().length < 10) {
      toast.error('Note must be at least 10 characters long');
      return;
    }

    try {
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

      toast.success('Note created successfully!');
      setNoteContent('');
      setIsCreateDialogOpen(false);
      fetchNotes(); // Refresh the list
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
  };

  const updateNote = async () => {
    if (!editingNote || !noteContent || noteContent.trim().length < 10) {
      toast.error('Note must be at least 10 characters long');
      return;
    }

    try {
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

      toast.success('Note updated successfully!');
      setNoteContent('');
      setEditingNote(null);
      setIsEditDialogOpen(false);
      fetchNotes(); // Refresh the list
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const deleteNote = async (noteId: number) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      toast.success('Note deleted successfully');
      fetchNotes(); // Refresh the list
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setIsEditDialogOpen(true);
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter((note) =>
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/child')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <BookOpen className="w-10 h-10 text-purple-600" />
                My Notes
              </h1>
              <p className="text-gray-600">
                Your personal knowledge collection • {filteredNotes.length} notes
                {searchQuery && ` (filtered from ${notes.length} total)`}
              </p>
            </div>
            <Button
              onClick={() => {
                setNoteContent('');
                setIsCreateDialogOpen(true);
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Note
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="🔍 Search your notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Notes Grid */}
        {filteredNotes.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchQuery ? 'No notes found' : 'No notes yet!'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first note or highlight important parts from quiz explanations.'}
              </p>
              {!searchQuery && (
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Note
                  </Button>
                  <Button variant="outline" onClick={() => setLocation('/child')}>
                    Take a Quiz
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <Card
                key={note.id}
                className="border-2 border-purple-200 bg-purple-50 hover:shadow-lg transition-shadow group relative"
              >
                <CardContent className="p-4">
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(note);
                      }}
                    >
                      <Edit className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this note?')) {
                          deleteNote(note.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  {/* Content */}
                  <p className="text-gray-800 text-sm mb-3 pr-16 whitespace-pre-wrap">
                    {note.content}
                  </p>

                  {/* Timestamp */}
                  <div className="flex items-center text-xs text-gray-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    {note.createdAt !== note.updatedAt ? 'Updated' : 'Saved'}{' '}
                    {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Note Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Write your note here... (minimum 10 characters)"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="min-h-[200px]"
            />
            <p className="text-sm text-gray-500 mt-2">
              {noteContent.length} characters
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createNote} disabled={noteContent.trim().length < 10}>
              Create Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Write your note here... (minimum 10 characters)"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="min-h-[200px]"
            />
            <p className="text-sm text-gray-500 mt-2">
              {noteContent.length} characters
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateNote} disabled={noteContent.trim().length < 10}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
