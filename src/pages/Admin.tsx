import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Plus, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileWithPreview extends File {
  id: string;
  name: string;
}

export default function Admin() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (files.length === 0) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const fileNames = files.map(f => f.name).join(', ');
      toast({
        title: "Success",
        description: `Uploaded: ${fileNames}`,
      });
      
      setFiles([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload files. Please try again.",
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
    <div className="container max-w-4xl mx-auto py-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload course materials
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              accept=".pdf,.txt"
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />

            <div className="space-y-4">
              {files.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PDF or text files (up to 50MB each)
                    </span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div 
                          key={file.id}
                          className="flex items-center justify-between p-2 border rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addMoreFiles}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More Files
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {files.length > 0 && (
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span> Uploading...
                    </span>
                  ) : (
                    `Upload ${files.length} File${files.length > 1 ? 's' : ''}`
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
} 