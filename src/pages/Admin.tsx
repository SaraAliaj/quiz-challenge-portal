import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Upload, Plus, Loader2, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { api } from "@/server/api"; // Adjust this import to match where your API functions are located
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface FileWithPreview extends File {
  id: string;
  name: string;
}

export default function Admin() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [lessonTitle, setLessonTitle] = useState<string>("");
  const [courses, setCourses] = useState<any[]>([]);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [days, setDays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check admin access on component mount
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }
  }, [user, navigate, toast]);

  // If user is not admin, don't render the component
  if (!user || user.role !== 'admin') {
    return null;
  }

  // Fetch all required data in a single useEffect
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all data in parallel
        const [coursesData, weeksData, daysData] = await Promise.all([
          api.getCourses(),
          api.getWeeks(),
          api.getDays()
        ]);
        
        console.log('Days data:', daysData);
        
        setCourses(coursesData);
        setWeeks(weeksData);
        setDays(daysData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          title: "Error",
          description: "Failed to load required data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast, navigate, user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    console.log('Files selected:', e.target.files.length);
    
    // Store the raw File objects directly
    const selectedFiles = Array.from(e.target.files);
    
    // Create new file objects with IDs for our state management
    const newFiles = selectedFiles.map(file => {
      // Store the original file object as a property
      return {
        ...file,
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        originalFile: file // Store the original File object
      };
    });

    setFiles(prev => [...prev, ...newFiles]);

    // Show toast for the first file and a summary if multiple
    if (newFiles.length === 1) {
      toast({
        title: "File Added",
        description: `Added: ${newFiles[0].name}`,
      });
    } else {
      toast({
        title: "Files Added",
        description: `Added ${newFiles.length} files`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCourse || !selectedWeek || !selectedDay || !lessonTitle) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      formData.append('courseId', String(selectedCourse));
      formData.append('weekId', String(selectedWeek));
      formData.append('dayId', String(selectedDay));
      formData.append('title', lessonTitle);
      
      for (const fileObj of files) {
        const fileToUpload = (fileObj as any).originalFile || fileObj;
        formData.append('files', fileToUpload);
      }
      
      const response = await api.uploadLesson(formData);
      console.log('Upload successful:', response);
      
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
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error('Lesson upload error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to upload lesson",
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

  const addMoreFiles = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default form submission
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-4 flex justify-center items-center min-h-[300px]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-gray-500">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Admin Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course">Select Course</Label>
                <Select
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course">
                      {selectedCourse && courses.find(course => course.id.toString() === selectedCourse)?.name}
                    </SelectValue>
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
              <div className="space-y-2">
                <Label htmlFor="week">Select Week</Label>
                <Select
                  value={selectedWeek}
                  onValueChange={setSelectedWeek}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select week">
                      {selectedWeek && weeks.find(week => week.id.toString() === selectedWeek)?.name}
                    </SelectValue>
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
              <div className="space-y-2">
                <Label htmlFor="day">Select Day</Label>
                <Select
                  value={selectedDay}
                  onValueChange={setSelectedDay}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day">
                      {selectedDay && days.find(day => day.id.toString() === selectedDay)?.name || 
                       selectedDay && days.find(day => day.id.toString() === selectedDay)?.day_name || 
                       "Select day"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {days.length > 0 ? days.map(day => (
                      <SelectItem key={day.id} value={day.id.toString()}>
                        {day.name || day.day_name || `Day ${day.id}`}
                      </SelectItem>
                    )) : (
                      <div className="p-2 text-sm text-gray-500">No days available</div>
                    )}
                  </SelectContent>
                </Select>
                
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title</Label>
                <Input
                  id="title"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Enter lesson title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="files">Upload Files</Label>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addMoreFiles}
                      disabled={isSubmitting}
                      className="flex items-center"
                    >
                      <Upload className="mr-2 h-4 w-4" /> Select Files
                    </Button>
                    <span className="text-sm text-gray-500">
                      {files.length === 0 
                        ? "No files selected" 
                        : `${files.length} file${files.length > 1 ? 's' : ''} selected`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Files will be uploaded when you submit the form. Make sure to select files before submitting.
                  </div>
                </div>
              </div>
              {files.length > 0 && (
                <div className="border rounded-md p-3 bg-gray-50">
                  <Label className="mb-2 block">Selected Files:</Label>
                  <ScrollArea className="max-h-60">
                    <ul className="space-y-2">
                      {files.map(file => (
                        <li key={file.id} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                          <div className="flex items-center">
                            <div className="mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                            </div>
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="h-8 w-8 p-0"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            <span className="sr-only">Remove</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-4"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading Lesson...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Lesson
                  </>
                )}
              </Button>
              
              {isSubmitting && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
                  <p className="font-medium">Uploading lesson...</p>
                  <p className="mt-1">This may take a moment depending on the file size. Please don't close this page.</p>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
