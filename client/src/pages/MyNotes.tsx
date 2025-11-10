import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, Calendar, ArrowRight, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';

export function MyNotes() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>();

  // Fetch notes with filters
  const { data: notes, isLoading, refetch } = trpc.smartNotes.list.useQuery({
    filterBy: {
      subject: selectedSubject,
      topic: selectedTopic,
      search: searchQuery,
    },
  });

  // Fetch filter options
  const { data: filterOptions } = trpc.smartNotes.getFilterOptions.useQuery();

  // Delete note mutation
  const deleteNoteMutation = trpc.smartNotes.delete.useMutation({
    onSuccess: () => {
      toast.success('Note deleted successfully');
      refetch();
    },
    onError: () => {
      toast.error('Failed to delete note');
    },
  });

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      Physics: 'border-blue-300 bg-blue-50',
      Chemistry: 'border-green-300 bg-green-50',
      Biology: 'border-purple-300 bg-purple-50',
      Mathematics: 'border-orange-300 bg-orange-50',
      default: 'border-gray-300 bg-gray-50',
    };
    return colors[subject] || colors.default;
  };

  const getTagColor = (type: string) => {
    const colors: Record<string, string> = {
      subject: 'bg-blue-100 text-blue-800',
      topic: 'bg-purple-100 text-purple-800',
      subTopic: 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <BookOpen className="w-10 h-10 text-purple-600" />
            My Notes
          </h1>
          <p className="text-gray-600">
            Your personal knowledge collection • {notes?.length || 0} notes saved
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Control Center */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-2 border-purple-200">
              <CardContent className="p-4 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="🔍 Search your notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Subject Filter */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">By Subject</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={selectedSubject === undefined ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedSubject(undefined)}
                    >
                      All
                    </Badge>
                    {filterOptions?.subjects.map((subject) => (
                      <Badge
                        key={subject}
                        variant={selectedSubject === subject ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedSubject(subject)}
                      >
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Topic Filter */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">By Topic</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={selectedTopic === undefined ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedTopic(undefined)}
                    >
                      All
                    </Badge>
                    {filterOptions?.topics.map((topic) => (
                      <Badge
                        key={topic}
                        variant={selectedTopic === topic ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedTopic(topic)}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Note Wall */}
          <div className="lg:col-span-3">
            {notes && notes.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No notes yet!
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Start highlighting important parts of explanations to build your personal knowledge base.
                  </p>
                  <Button onClick={() => setLocation('/child')}>
                    Take a Quiz
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes?.map((note) => {
                  const subject = note.tags.find((t) => t.type === 'subject')?.name || 'General';
                  const topic = note.tags.find((t) => t.type === 'topic')?.name;
                  const subTopic = note.tags.find((t) => t.type === 'subTopic')?.name;

                  return (
                    <Card
                      key={note.id}
                      className={`border-2 ${getSubjectColor(subject)} hover:shadow-lg transition-shadow cursor-pointer group relative`}
                      onClick={() => setLocation(`/child/notes/${note.id}`)}
                    >
                      <CardContent className="p-4">
                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this note?')) {
                              deleteNoteMutation.mutate({ noteId: note.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>

                        {/* Content snippet */}
                        <p className="text-gray-800 text-sm mb-3 line-clamp-3">
                          {note.content}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {topic && (
                            <Badge className={getTagColor('topic')} variant="secondary">
                              {topic}
                            </Badge>
                          )}
                          {subTopic && (
                            <Badge className={getTagColor('subTopic')} variant="secondary">
                              {subTopic}
                            </Badge>
                          )}
                        </div>

                        {/* Source context */}
                        {note.sourceQuestion && (
                          <p className="text-xs text-gray-500 mb-2">
                            From a question about "{note.sourceQuestion.text.substring(0, 50)}..."
                          </p>
                        )}

                        {/* Timestamp */}
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Saved {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                          </span>
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
