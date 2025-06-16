import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Urination } from "@shared/schema";

const urinationSchema = z.object({
  occuredAt: z.string().min(1, "Time is required"),
  color: z.string().optional(),
  frequency: z.string().optional(),
  volume: z.string().optional(),
  urgency: z.string().optional(),
  notes: z.string().optional(),
});

type UrinationFormData = z.infer<typeof urinationSchema>;

interface EditUrinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Urination;
  onSuccess: () => void;
}

export default function EditUrinationModal({ isOpen, onClose, record, onSuccess }: EditUrinationModalProps) {
  const { toast } = useToast();
  
  const form = useForm<UrinationFormData>({
    resolver: zodResolver(urinationSchema),
    defaultValues: {
      occuredAt: "",
      color: "",
      frequency: "",
      volume: "",
      urgency: "",
      notes: "",
    },
  });

  // Update form when record changes
  useEffect(() => {
    if (record) {
      const formattedDate = new Date(record.occuredAt).toISOString().slice(0, 16);
      form.reset({
        occuredAt: formattedDate,
        color: record.color || "",
        frequency: record.frequency || "",
        volume: record.volume?.toString() || "",
        urgency: record.urgency || "",
        notes: record.notes || "",
      });
    }
  }, [record, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: UrinationFormData) => {
      const urinationData = {
        ...data,
        occuredAt: new Date(data.occuredAt).toISOString(),
        volume: data.volume ? parseInt(data.volume) : null,
      };
      
      return await apiRequest("PUT", `/api/urination/${record.id}`, urinationData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Urination record updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/urination'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update urination record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UrinationFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Urination Record</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="occuredAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date and Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None specified</SelectItem>
                      <SelectItem value="clear">Clear</SelectItem>
                      <SelectItem value="pale-yellow">Pale Yellow</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="dark-yellow">Dark Yellow</SelectItem>
                      <SelectItem value="amber">Amber</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="brown">Brown</SelectItem>
                      <SelectItem value="cloudy">Cloudy</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None specified</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="frequent">Frequent</SelectItem>
                      <SelectItem value="infrequent">Infrequent</SelectItem>
                      <SelectItem value="difficult">Difficult to start</SelectItem>
                      <SelectItem value="interrupted">Interrupted stream</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="volume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Volume (ml)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Volume in milliliters"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgency Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None specified</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Very Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes or observations"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Record"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}