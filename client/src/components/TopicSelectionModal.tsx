import React, { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TopicCategory {
  name: string;
  topics: string[];
}

const DEFAULT_TOPICS: TopicCategory[] = [
  {
    name: "Mathematics",
    topics: ["Algebra", "Calculus", "Statistics", "Geometry", "Trigonometry", "Linear Algebra"]
  },
  {
    name: "Physics",
    topics: ["Mechanics", "Quantum Physics", "Relativity", "Thermodynamics", "Electromagnetism"]
  },
  {
    name: "Computer Science",
    topics: ["Algorithms", "Data Structures", "Machine Learning", "Web Development", "Databases", "Quantum Computing"]
  },
  {
    name: "Biology",
    topics: ["Genetics", "Evolution", "Anatomy", "Ecology", "Microbiology", "Cell Biology"]
  },
  {
    name: "Chemistry",
    topics: ["Organic Chemistry", "Inorganic Chemistry", "Biochemistry", "Physical Chemistry", "Analytical Chemistry"]
  },
  {
    name: "Languages",
    topics: ["English Grammar", "Spanish", "French", "German", "Mandarin", "Japanese"]
  }
];

interface TopicSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTopic: (topic: string) => void;
}

const TopicSelectionModal: React.FC<TopicSelectionModalProps> = ({
  open,
  onOpenChange,
  onSelectTopic
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  // Filter topics based on search term
  const filteredTopics = searchTerm 
    ? DEFAULT_TOPICS.map(category => ({
        name: category.name,
        topics: category.topics.filter(topic => 
          topic.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(category => category.topics.length > 0)
    : DEFAULT_TOPICS;
  
  const handleConfirm = () => {
    if (selectedTopic) {
      onSelectTopic(selectedTopic);
      setSelectedTopic(null);
      setSelectedCategory(null);
      setSearchTerm("");
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Topic</DialogTitle>
          <DialogDescription>
            Choose a topic for your educational session
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4">
          <div className="relative">
            <Input
              placeholder="Search topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        
        <div className="h-64 overflow-y-auto mb-4">
          {selectedCategory ? (
            <div>
              <div className="flex items-center mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedCategory(null)}
                  className="p-0 mr-2"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="mr-1"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Back
                </Button>
                <h3 className="font-medium">{selectedCategory}</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {filteredTopics
                  .find(cat => cat.name === selectedCategory)
                  ?.topics.map(topic => (
                    <button
                      key={topic}
                      className={`text-left p-3 border rounded-lg hover:border-primary hover:bg-primary-50 
                        ${selectedTopic === topic ? 'border-primary bg-primary-50' : ''}`}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      {topic}
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTopics.map(category => (
                <div 
                  key={category.name}
                  className="border rounded-lg p-3 hover:border-primary hover:bg-primary-50 cursor-pointer"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  <h4 className="font-medium">{category.name}</h4>
                  <p className="text-sm text-neutral-500">
                    {category.topics.slice(0, 3).join(", ")}
                    {category.topics.length > 3 ? "..." : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedTopic(null);
              setSelectedCategory(null);
              setSearchTerm("");
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedTopic}
          >
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TopicSelectionModal;
