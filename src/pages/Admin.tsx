import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Plus, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FileWithPreview extends File {
  id: string;
  name: string;
}

// Sample data for dropdowns
const courses = [
  { id: 1, name: "React Development" },
  { id: 2, name: "SQL Mastery" },
  { id: 3, name: "Python Fundamentals" },
];

// Generate weeks 1-12
const weeks = Array.from({ length: 12 }, (_, i) => ({ 
  id: i + 1, 
  name: `Week ${i + 1}` 
}));

// Generate days 1-7
const days = Array.from({ length: 7 }, (_, i) => ({ 
  id: i + 1, 
  name: `Day ${i + 1}` 
}));

export default function Admin() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [lessonTitle, setLessonTitle] = useState<string>("");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const validFiles = selectedFiles.filter(file => {
      if (file.type === "application/pdf" || file.type === "text/plain") {
        return true;
      }
      toast({
        title: "Invalid file type",
        description: `${file.name} is not a valid file type. Please upload PDF or text files.`,
        variant: "destructive",
      });
      return false;
    });

    const newFiles = validFiles.map(file => ({
      ...file,
      id: `${file.name}-${Date.now()}`,
      name: file.name
    }));

    setFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      toast({
        title: "File Added",
        description: `Added: ${file.name}`,
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedCourse || !selectedWeek || !selectedDay || !lessonTitle) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one file",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('courseId', selectedCourse);
      formData.append('weekId', selectedWeek);
      formData.append('dayId', selectedDay);
      formData.append('title', lessonTitle);
      
      files.forEach(file => {
        formData.append('files', file);
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: `Lesson "${lessonTitle}" uploaded successfully`,
      });
      
      // Reset form
      setSelectedCourse("");
      setSelectedWeek("");
      setSelectedDay("");
      setLessonTitle("");
      setFiles([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload lesson. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove) {
      setFiles(prev => prev.filter(file => file.id !== fileId));
      toast({
        title: "File Removed",
        description: `Removed: ${fileToRemove.name}`,
      });
    }
  };

  const addMoreFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Course Material Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Course selection */}
              <div>
                <Label htmlFor="course" className="text-xs font-medium">Course</Label>
                <Select 
                  value={selectedCourse} 
                  onValueChange={setSelectedCourse}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Week selection */}
              <div>
                <Label htmlFor="week" className="text-xs font-medium">Week</Label>
                <Select 
                  value={selectedWeek} 
                  onValueChange={setSelectedWeek}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weeks.map(week => (
                      <SelectItem key={week.id} value={week.id.toString()}>
                        {week.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Day selection */}
              <div>
                <Label htmlFor="day" className="text-xs font-medium">Day</Label>
                <Select 
                  value={selectedDay} 
                  onValueChange={setSelectedDay}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map(day => (
                      <SelectItem key={day.id} value={day.id.toString()}>
                        {day.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lesson title */}
            <div>
              <Label htmlFor="lesson-title" className="text-xs font-medium">Lesson Title</Label>
              <Input
                id="lesson-title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Enter lesson title"
                className="h-9"
              />
            </div>

            {/* File upload */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-medium">Upload Materials</Label>
                {files.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMoreFiles}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Files
                  </Button>
                )}
              </div>
              <Input
                id="file-upload"
                type="file"
                ref={fileInputRef}
                accept=".pdf,.txt"
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />

              {files.length === 0 ? (
                <div className="border border-dashed rounded-md p-4 text-center">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Click to upload PDF or text files
                    </span>
                  </label>
                </div>
              ) : (
                <ScrollArea className="h-[150px] w-full rounded-md border p-2">
                  <div className="space-y-1">
                    {files.map((file) => (
                      <div 
                        key={file.id}
                        className="flex items-center justify-between p-1.5 border rounded-md bg-muted/30"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-xs truncate">{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button 
                type="submit"
                disabled={isSubmitting}
                size="sm"
                className="px-4"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Uploading...
                  </span>
                ) : (
                  "Upload Lesson"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 