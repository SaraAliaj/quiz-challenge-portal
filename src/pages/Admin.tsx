import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Upload, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api } from "@/server/api"; // Adjust this import to match where your API functions are located

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
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesData = await api.getCourses(); // API call to get courses
        setCourses(coursesData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch courses",
          variant: "destructive",
        });
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const weeksData = await api.getWeeks(); // API call to get weeks
        setWeeks(weeksData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch weeks",
          variant: "destructive",
        });
      }
    };
    fetchWeeks();
  }, []);

  useEffect(() => {
    const fetchDays = async () => {
      try {
        const daysData = await api.getDays(); // API call to get days
        setDays(daysData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch days",
          variant: "destructive",
        });
      }
    };
    fetchDays();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    console.log('Files selected:', e.target.files.length);
    
    // Store the raw File objects directly
    const selectedFiles = Array.from(e.target.files);
    
    // Log each file's properties to verify they're valid File objects
    selectedFiles.forEach((file, index) => {
      console.log(`Selected file ${index + 1}:`, {
        name: file.name,
        type: file.type || 'unknown type',
        size: file.size,
        lastModified: file.lastModified,
        constructor: file.constructor.name
      });
    });
    
    const validFiles = selectedFiles.filter(file => {
      // Accept all file types for debugging
      return true;
    });

    // Create new file objects with IDs for our state management
    const newFiles = validFiles.map(file => ({
      ...file,
      id: `${file.name}-${Date.now()}`,
      name: file.name,
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
    
    if (!selectedCourse || !selectedWeek || !selectedDay || !lessonTitle) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Check if we have files in the input element
    const hasInputFiles = fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files.length > 0;
    
    // If no files in input and no files in state, show error
    if (!hasInputFiles && files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one file",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a fresh FormData instance
      const formData = new FormData();
      
      // Add form fields
      formData.append('courseId', String(selectedCourse));
      formData.append('weekId', String(selectedWeek));
      formData.append('dayId', String(selectedDay));
      formData.append('title', lessonTitle);
      
      console.log('Form data values:', {
        courseId: selectedCourse,
        weekId: selectedWeek,
        dayId: selectedDay,
        title: lessonTitle
      });
      
      // IMPORTANT: Use the files directly from the input element if available
      if (hasInputFiles) {
        const inputFiles = fileInputRef.current!.files!;
        console.log(`Adding ${inputFiles.length} files from input element`);
        
        for (let i = 0; i < inputFiles.length; i++) {
          const file = inputFiles[i];
          console.log(`Adding file ${i+1}/${inputFiles.length}:`, {
            name: file.name,
            type: file.type || 'unknown',
            size: file.size
          });
          
          // Add each file with the field name 'files'
          formData.append('files', file);
        }
      } 
      // Fallback to files in state if needed
      else if (files.length > 0) {
        console.log(`Adding ${files.length} files from state`);
        
        for (let i = 0; i < files.length; i++) {
          const fileObj = files[i];
          // Fix the type casting to avoid TypeScript errors
          // FileWithPreview already extends File, so we can use it directly
          
          console.log(`Adding file ${i+1}/${files.length}:`, {
            name: fileObj.name,
            size: fileObj.size
          });
          
          // Use the file object directly - it's already a File with our custom properties
          formData.append('files', fileObj as unknown as Blob);
        }
      }
      
      // Verify FormData contains files
      let fileCount = 0;
      for (const [key, value] of formData.entries()) {
        if (key === 'files') {
          fileCount++;
          console.log(`FormData contains file:`, {
            key,
            isFile: value instanceof File,
            name: value instanceof File ? value.name : 'not a file',
            type: value instanceof File ? value.type : 'unknown',
            size: value instanceof File ? value.size : 'unknown'
          });
        } else {
          console.log(`FormData field: ${key}=${value}`);
        }
      }
      
      if (fileCount === 0) {
        throw new Error('No files were added to the form data');
      }
      
      console.log(`FormData contains ${fileCount} files`);
      
      // Submit the form
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
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error('Lesson upload error:', error);
      
      // Show detailed error message
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

  const addMoreFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Admin Lesson Upload</CardTitle>
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
                      {selectedDay && days.find(day => day.id.toString() === selectedDay)?.name}
                    </SelectValue>
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
              <div className="space-y-2">
                <Label htmlFor="lessonTitle">Lesson Title</Label>
                <Input
                  id="lessonTitle"
                  value={lessonTitle}
                  onChange={e => setLessonTitle(e.target.value)}
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
