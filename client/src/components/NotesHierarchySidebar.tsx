/**
 * Enhanced Notes Hierarchy Sidebar
 * Features:
 * - Show Topics / Sub-Topics checkboxes
 * - Lazy loading for performance
 * - Collapsible tree structure
 * - Optimized for thousands of notes
 */

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react';

interface TagCount {
  name: string;
  count: number;
}

interface HierarchyData {
  subjects: TagCount[];
  topics: TagCount[];
  subtopics: TagCount[];
  totalNotes: number;
}

interface NotesHierarchySidebarProps {
  onFilterChange: (subject: string | null, topic: string | null, subtopic: string | null) => void;
}

export function NotesHierarchySidebar({ onFilterChange }: NotesHierarchySidebarProps) {
  const [showTopics, setShowTopics] = useState(false);
  const [showSubTopics, setShowSubTopics] = useState(false);
  
  const [hierarchy, setHierarchy] = useState<HierarchyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  
  const [subjectTopics, setSubjectTopics] = useState<Record<string, TagCount[]>>({});
  const [topicSubtopics, setTopicSubtopics] = useState<Record<string, TagCount[]>>({});
  
  const [loadingTopics, setLoadingTopics] = useState<Set<string>>(new Set());
  const [loadingSubtopics, setLoadingSubtopics] = useState<Set<string>>(new Set());
  
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  
  // Fetch initial hierarchy (subjects only)
  useEffect(() => {
    fetchHierarchy();
  }, []);
  
  const fetchHierarchy = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notes/tag-hierarchy', {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch hierarchy');
      
      const data = await response.json();
      setHierarchy(data);
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Lazy load topics for a subject
  const fetchTopicsForSubject = async (subject: string) => {
    if (subjectTopics[subject]) return; // Already loaded
    
    try {
      setLoadingTopics(prev => new Set(prev).add(subject));
      
      const response = await fetch(`/api/notes/tag-hierarchy/topics/${encodeURIComponent(subject)}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch topics');
      
      const data = await response.json();
      setSubjectTopics(prev => ({ ...prev, [subject]: data.topics }));
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoadingTopics(prev => {
        const newSet = new Set(prev);
        newSet.delete(subject);
        return newSet;
      });
    }
  };
  
  // Lazy load sub-topics for a subject + topic combination
  const fetchSubtopicsForTopic = async (subject: string, topic: string) => {
    const key = `${subject}::${topic}`;
    if (topicSubtopics[key]) return; // Already loaded
    
    try {
      setLoadingSubtopics(prev => new Set(prev).add(key));
      
      const response = await fetch(
        `/api/notes/tag-hierarchy/subtopics/${encodeURIComponent(subject)}/${encodeURIComponent(topic)}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) throw new Error('Failed to fetch subtopics');
      
      const data = await response.json();
      setTopicSubtopics(prev => ({ ...prev, [key]: data.subtopics }));
    } catch (error) {
      console.error('Error fetching subtopics:', error);
    } finally {
      setLoadingSubtopics(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };
  
  // Handle subject click
  const handleSubjectClick = (subject: string) => {
    const isExpanded = expandedSubjects.has(subject);
    
    if (isExpanded) {
      // Collapse
      const newExpanded = new Set(expandedSubjects);
      newExpanded.delete(subject);
      setExpandedSubjects(newExpanded);
    } else {
      // Expand
      const newExpanded = new Set(expandedSubjects);
      newExpanded.add(subject);
      setExpandedSubjects(newExpanded);
      
      // Lazy load topics if needed
      if (showTopics) {
        fetchTopicsForSubject(subject);
      }
    }
    
    // Set selection
    setSelectedSubject(subject);
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    onFilterChange(subject, null, null);
  };
  
  // Handle topic click
  const handleTopicClick = (subject: string, topic: string) => {
    const key = `${subject}::${topic}`;
    const isExpanded = expandedTopics.has(key);
    
    if (isExpanded) {
      // Collapse
      const newExpanded = new Set(expandedTopics);
      newExpanded.delete(key);
      setExpandedTopics(newExpanded);
    } else {
      // Expand
      const newExpanded = new Set(expandedTopics);
      newExpanded.add(key);
      setExpandedTopics(newExpanded);
      
      // Lazy load sub-topics if needed
      if (showSubTopics) {
        fetchSubtopicsForTopic(subject, topic);
      }
    }
    
    // Set selection
    setSelectedSubject(subject);
    setSelectedTopic(topic);
    setSelectedSubtopic(null);
    onFilterChange(subject, topic, null);
  };
  
  // Handle subtopic click
  const handleSubtopicClick = (subject: string, topic: string, subtopic: string) => {
    setSelectedSubject(subject);
    setSelectedTopic(topic);
    setSelectedSubtopic(subtopic);
    onFilterChange(subject, topic, subtopic);
  };
  
  // Handle "All Notes" click
  const handleAllNotesClick = () => {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    onFilterChange(null, null, null);
  };
  
  // Handle checkbox changes
  const handleShowTopicsChange = (checked: boolean) => {
    setShowTopics(checked);
    if (!checked) {
      setShowSubTopics(false); // Can't show sub-topics without topics
    }
    // Clear expanded states when toggling
    setExpandedSubjects(new Set());
    setExpandedTopics(new Set());
  };
  
  const handleShowSubTopicsChange = (checked: boolean) => {
    setShowSubTopics(checked);
    if (checked && !showTopics) {
      setShowTopics(true); // Auto-enable topics if sub-topics is checked
    }
    // Clear expanded topic states when toggling
    setExpandedTopics(new Set());
  };
  
  if (isLoading) {
    return (
      <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
  }
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 sticky top-16 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📚 My Smart Notes</h3>
        
        {/* Filter Checkboxes */}
        <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTopics}
              onChange={(e) => handleShowTopicsChange(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Show Topics</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSubTopics}
              onChange={(e) => handleShowSubTopicsChange(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Show Sub-Topics</span>
          </label>
        </div>
      </div>
      
      {/* All Notes Button */}
      <button
        onClick={handleAllNotesClick}
        className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
          !selectedSubject
            ? 'bg-purple-100 text-purple-900 font-semibold'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm">All Notes</span>
          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
            {hierarchy?.totalNotes || 0}
          </span>
        </div>
      </button>
      
      <div className="border-t border-gray-200 my-4"></div>
      
      {/* Subjects List */}
      <div className="space-y-1">
        {hierarchy?.subjects.map((subject) => {
          const isExpanded = expandedSubjects.has(subject.name);
          const isSelected = selectedSubject === subject.name && !selectedTopic;
          const topics = subjectTopics[subject.name] || [];
          const isLoadingTopics = loadingTopics.has(subject.name);
          
          return (
            <div key={subject.name}>
              {/* Subject Button */}
              <button
                onClick={() => handleSubjectClick(subject.name)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-blue-100 text-blue-900 font-semibold'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {showTopics && (
                      isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="text-sm">📘 {subject.name}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                    {subject.count}
                  </span>
                </div>
              </button>
              
              {/* Topics (if expanded and showTopics is checked) */}
              {showTopics && isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {isLoadingTopics ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading topics...
                    </div>
                  ) : topics.length > 0 ? (
                    topics.map((topic) => {
                      const topicKey = `${subject.name}::${topic.name}`;
                      const isTopicExpanded = expandedTopics.has(topicKey);
                      const isTopicSelected = selectedTopic === topic.name && selectedSubject === subject.name && !selectedSubtopic;
                      const subtopics = topicSubtopics[topicKey] || [];
                      const isLoadingSubtopics = loadingSubtopics.has(topicKey);
                      
                      return (
                        <div key={topic.name}>
                          {/* Topic Button */}
                          <button
                            onClick={() => handleTopicClick(subject.name, topic.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                              isTopicSelected
                                ? 'bg-green-100 text-green-900 font-semibold'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {showSubTopics && (
                                  isTopicExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                                )}
                                <span>🏷️ {topic.name}</span>
                              </div>
                              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                                {topic.count}
                              </span>
                            </div>
                          </button>
                          
                          {/* Sub-topics (if expanded and showSubTopics is checked) */}
                          {showSubTopics && isTopicExpanded && (
                            <div className="ml-4 mt-1 space-y-1">
                              {isLoadingSubtopics ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Loading...
                                </div>
                              ) : subtopics.length > 0 ? (
                                subtopics.map((subtopic) => {
                                  const isSubtopicSelected = 
                                    selectedSubtopic === subtopic.name && 
                                    selectedTopic === topic.name && 
                                    selectedSubject === subject.name;
                                  
                                  return (
                                    <button
                                      key={subtopic.name}
                                      onClick={() => handleSubtopicClick(subject.name, topic.name, subtopic.name)}
                                      className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors text-xs ${
                                        isSubtopicSelected
                                          ? 'bg-purple-100 text-purple-900 font-semibold'
                                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span>🔖 {subtopic.name}</span>
                                        <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                                          {subtopic.count}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-xs text-gray-500 italic">
                                  No sub-topics
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">
                      No topics
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
