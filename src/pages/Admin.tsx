import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function Admin() {
  const [textbook, setTextbook] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textbook.trim()) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement actual submission logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: "Textbook content has been submitted successfully.",
      });
      
      setTextbook("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit textbook content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submit new textbook content for the curriculum
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Textbook Content
              </label>
              <Textarea
                value={textbook}
                onChange={(e) => setTextbook(e.target.value)}
                placeholder="Enter the textbook content here..."
                className="mt-1.5 min-h-[400px]"
              />
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={isSubmitting || !textbook.trim()}
              >
                {isSubmitting ? "Submitting..." : "Submit Textbook"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
} 