import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { type CareRecipient, insertCareRecipientSchema } from "@shared/schema";
import { Plus, MoreVertical, Trash2, Pencil } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CareRecipientTabsProps {
  careRecipients: CareRecipient[];
  activeCareRecipient: string | null;
  onChangeRecipient: (id: string) => void;
  isLoading?: boolean;
}

export default function CareRecipientTabs({
  careRecipients,
  activeCareRecipient,
  onChangeRecipient,
  isLoading = false
}: CareRecipientTabsProps) {
  const [recipientToDelete, setRecipientToDelete] = useState<CareRecipient | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recipientToEdit, setRecipientToEdit] = useState<CareRecipient | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRecipientName, setNewRecipientName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const newRecipientInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Focus input field when edit dialog opens
  useEffect(() => {
    if (showEditDialog && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showEditDialog]);
  
  // Focus input field when add dialog opens
  useEffect(() => {
    if (showAddDialog && newRecipientInputRef.current) {
      newRecipientInputRef.current.focus();
    }
  }, [showAddDialog]);
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/care-recipients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/care-recipients'] });
      
      // If the deleted recipient was active, select another one
      if (recipientToDelete && recipientToDelete.id.toString() === activeCareRecipient) {
        const otherRecipient = careRecipients.find(r => r.id !== recipientToDelete.id);
        if (otherRecipient) {
          onChangeRecipient(otherRecipient.id.toString());
        }
      }
      
      toast({
        title: "Care recipient removed",
        description: `${recipientToDelete?.name} has been removed from your care list.`,
        variant: "default",
      });
      
      setRecipientToDelete(null);
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove care recipient. Please try again.",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    }
  });
  
  // Edit name mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      await apiRequest("PATCH", `/api/care-recipients/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/care-recipients'] });
      
      toast({
        title: "Name updated",
        description: `Name has been updated to "${newName}".`,
        variant: "default",
      });
      
      setRecipientToEdit(null);
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update name. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Add recipient mutation
  const addRecipientMutation = useMutation({
    mutationFn: async (name: string) => {
      // Send just the name - the backend will automatically associate with the authenticated user
      const data = { 
        name: name.trim(), 
        status: 'active'
      };
      const res = await apiRequest("POST", "/api/care-recipients", data);
      return await res.json();
    },
    onSuccess: (newRecipient) => {
      queryClient.invalidateQueries({ queryKey: ['/api/care-recipients'] });
      
      // Set the new recipient as active
      onChangeRecipient(newRecipient.id.toString());
      
      toast({
        title: "Care recipient added",
        description: `${newRecipientName} has been added to your care list.`,
        variant: "default",
      });
      
      setNewRecipientName("");
      setShowAddDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add care recipient. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleDeleteClick = (recipient: CareRecipient, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab change
    setRecipientToDelete(recipient);
    setShowDeleteDialog(true);
  };
  
  const handleEditClick = (recipient: CareRecipient, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab change
    setRecipientToEdit(recipient);
    setNewName(recipient.name);
    setShowEditDialog(true);
  };
  
  const confirmDelete = () => {
    if (recipientToDelete) {
      deleteMutation.mutate(recipientToDelete.id);
    }
  };
  
  const confirmEdit = () => {
    if (recipientToEdit && newName.trim()) {
      editMutation.mutate({ id: recipientToEdit.id, name: newName.trim() });
    }
  };
  
  const handleAddClick = () => {
    setNewRecipientName("");
    setShowAddDialog(true);
  };
  
  const confirmAdd = () => {
    if (newRecipientName.trim()) {
      addRecipientMutation.mutate(newRecipientName.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="mt-3 border-b border-gray-200">
        <div className="flex space-x-6 overflow-x-auto pb-1 scrollbar-hide">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-3 border-b border-gray-200">
        <div className="flex space-x-6 overflow-x-auto pb-1 scrollbar-hide">
          {/* Sort care recipients by ID in ascending order to show oldest first */}
          {[...careRecipients].sort((a, b) => a.id - b.id).map((recipient) => (
            <div key={recipient.id} className="flex items-center">
              <Button
                variant="ghost"
                className={`py-2 px-1 font-medium text-sm relative ${
                  recipient.id.toString() === activeCareRecipient
                    ? "border-b-2 border-primary text-primary"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => onChangeRecipient(recipient.id.toString())}
              >
                {recipient.name}
              </Button>
              
              {/* Delete button (only show for active recipient) */}
              {recipient.id.toString() === activeCareRecipient && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={(e) => handleEditClick(recipient, e as unknown as React.MouseEvent)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit name
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-500 focus:text-red-500"
                      onClick={(e) => handleDeleteClick(recipient, e as unknown as React.MouseEvent)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            className="py-2 px-1 text-sm text-gray-400 hover:text-primary"
            onClick={handleAddClick}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Care Recipient</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-bold text-red-600">Warning: This is a permanent action that cannot be undone.</p>
              <p>Are you sure you want to remove {recipientToDelete?.name}?</p>
              <div className="bg-amber-50 p-3 border border-amber-200 rounded-md mt-2">
                <p className="font-semibold mb-1">The following data will be permanently deleted:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>All medications and medication logs</li>
                  <li>Doctor and pharmacy information</li>
                  <li>Appointments and schedules</li>
                  <li>Emergency information</li>
                  <li>Health records (blood pressure, glucose, insulin, etc.)</li>
                  <li>Sleep records, meal tracking, and notes</li>
                  <li>All other data associated with this care recipient</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Name Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Care Recipient Name</DialogTitle>
            <DialogDescription>
              Change the name for this care recipient.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              ref={nameInputRef}
              placeholder="Enter name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmEdit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={confirmEdit}
              disabled={!newName.trim() || editMutation.isPending}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Recipient Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Care Recipient</DialogTitle>
            <DialogDescription>
              Add a new person to your care list.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              ref={newRecipientInputRef}
              placeholder="Enter name"
              value={newRecipientName}
              onChange={(e) => setNewRecipientName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmAdd();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={confirmAdd}
              disabled={!newRecipientName.trim() || addRecipientMutation.isPending}
            >
              {addRecipientMutation.isPending ? "Adding..." : "Add Recipient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
