import React, { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TopicCategory {
  name: string;
  topics: string[];
}

// Define education and difficulty levels
type EducationLevel = "Class 1-5" | "Class 6-8" | "Class 9-10" | "Class 11-12" | "Bachelors" | "Masters" | "PhD";
type DifficultyLevel = "Beginner" | "Standard" | "Advanced";

const EDUCATION_LEVELS: EducationLevel[] = [
  "Class 1-5", "Class 6-8", "Class 9-10", "Class 11-12", "Bachelors", "Masters", "PhD"
];

const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  "Beginner", "Standard", "Advanced"
];

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
  onSelectTopic: (topic: string, educationLevel: EducationLevel, difficultyLevel: DifficultyLevel) => void;
}

interface TopicMetadata {
  topic: string;
  educationLevel: EducationLevel;
  difficultyLevel: DifficultyLevel;
}

const TopicSelectionModal: React.FC<TopicSelectionModalProps> = ({
  open,
  onOpenChange,
  onSelectTopic
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "custom">("browse");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("Class 9-10");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("Standard");
  
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
    if (activeTab === "browse" && selectedTopic) {
      onSelectTopic(selectedTopic, educationLevel, difficultyLevel);
      resetState();
    } else if (activeTab === "custom" && customTopic.trim()) {
      onSelectTopic(customTopic.trim(), educationLevel, difficultyLevel);
      resetState();
    }
  };
  
  const resetState = () => {
    setSelectedTopic(null);
    setSelectedCategory(null);
    setSearchTerm("");
    setCustomTopic("");
    onOpenChange(false);
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
        
        <Tabs defaultValue="browse" onValueChange={(value) => setActiveTab(value as "browse" | "custom")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="browse">Browse Topics</TabsTrigger>
            <TabsTrigger value="custom">Custom Topic</TabsTrigger>
          </TabsList>
          
          <TabsContent value="browse">
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
                    {selectedTopic && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleConfirm}
                        className="ml-auto"
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
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Done
                      </Button>
                    )}
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
          </TabsContent>
          
          <TabsContent value="custom">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Enter custom topic:</label>
              <Input
                placeholder="E.g., 'Nuclear Physics' or 'South American History'"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="mb-2"
              />
              <p className="text-sm text-muted-foreground">
                Enter any subject you want to learn about. Be specific for better results.
              </p>
            </div>
            
            {customTopic.trim() && (
              <div className="mb-4 p-3 border rounded-lg bg-primary-50 border-primary">
                <div className="flex items-center">
                  <Plus className="h-4 w-4 mr-2 text-primary" />
                  <p className="font-medium">{customTopic}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  The system will generate questions about this topic
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Configuration Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Education Level</label>
              <Select 
                value={educationLevel} 
                onValueChange={(value) => setEducationLevel(value as EducationLevel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select education level" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Difficulty Level</label>
              <Select 
                value={difficultyLevel} 
                onValueChange={(value) => setDifficultyLevel(value as DifficultyLevel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={resetState}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={(activeTab === "browse" && !selectedTopic) || 
                     (activeTab === "custom" && !customTopic.trim())}
            className="bg-primary hover:bg-primary-dark"
          >
            Start Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TopicSelectionModal;
