import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TabType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Phone, Plus, User, Stethoscope, Pencil } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import PageHeader from "@/components/PageHeader";
import BottomNavigation from "@/components/BottomNavigation";
import type { Doctor } from "@shared/schema";
import { useCareRecipient } from "@/hooks/use-care-recipient";
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/utils";

interface DoctorsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Doctors({ activeTab, setActiveTab }: DoctorsProps) {
  // Use global care recipient context
  const { activeCareRecipientId } = useCareRecipient();
  
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [isEditDoctorOpen, setIsEditDoctorOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    phoneNumber: "",
    address: "",
    email: "",
    notes: "",
  });
  
  const { toast } = useToast();
  
  // Fetch doctors
  const { data: doctors = [], isLoading: isLoadingDoctors } = useQuery({
    queryKey: ["/api/doctors", activeCareRecipientId],
    enabled: !!activeCareRecipientId,
  });
  
  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for phone numbers
    if (name === "phoneNumber") {
      setFormData(prev => ({ ...prev, [name]: normalizePhoneNumber(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Find a doctor by ID
  const findDoctorById = (id: number) => {
    if (!doctors) return null;
    return doctors.find((doctor: Doctor) => doctor.id === id);
  };

  // Open edit doctor dialog
  const openEditDoctorDialog = (doctorId: number) => {
    const doctor = findDoctorById(doctorId);
    if (!doctor) return;
    
    setFormData({
      name: doctor.name,
      specialty: doctor.specialty,
      phoneNumber: doctor.phoneNumber,
      address: doctor.address || "",
      email: doctor.email || "",
      notes: doctor.notes || "",
    });
    
    setEditingDoctorId(doctorId);
    setIsEditDoctorOpen(true);
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      specialty: "",
      phoneNumber: "",
      address: "",
      email: "",
      notes: ""
    });
    setEditingDoctorId(null);
  };
  
  // Handle add doctor
  const handleAddDoctor = async () => {
    if (!activeCareRecipientId) return;
    
    try {
      await apiRequest(
        "POST", 
        "/api/doctors", 
        {
          ...formData,
          careRecipientId: Number(activeCareRecipientId)
        }
      );
      
      // Reset form and close dialog
      resetForm();
      setIsAddDoctorOpen(false);
      
      // Invalidate doctors query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", activeCareRecipientId] });
      
      toast({
        title: "Doctor added successfully",
        description: `${formData.name} has been added to your doctor list.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error adding doctor:", error);
      toast({
        title: "Failed to add doctor",
        description: "There was an error adding the doctor. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle edit doctor
  const handleEditDoctor = async () => {
    if (!activeCareRecipientId || !editingDoctorId) return;
    
    try {
      await apiRequest(
        "PATCH", 
        `/api/doctors/${editingDoctorId}`, 
        {
          ...formData,
          careRecipientId: Number(activeCareRecipientId)
        }
      );
      
      // Reset form and close dialog
      resetForm();
      setIsEditDoctorOpen(false);
      
      // Invalidate doctors query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", activeCareRecipientId] });
      
      toast({
        title: "Doctor updated successfully",
        description: `${formData.name}'s information has been updated.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating doctor:", error);
      toast({
        title: "Failed to update doctor",
        description: "There was an error updating the doctor. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <PageHeader title="Doctors" icon={<Stethoscope className="h-6 w-6" />} />
      
      {/* Care Recipient Tabs are no longer needed since we're using global context */}
      
      {/* Add Doctor Button */}
      {activeCareRecipientId && (
        <div className="flex justify-end mb-4">
          <Dialog open={isAddDoctorOpen} onOpenChange={setIsAddDoctorOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Doctor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Doctor</DialogTitle>
                <DialogDescription>
                  Enter the doctor's details below. All fields marked with * are required.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="specialty" className="text-right">
                    Specialty *
                  </Label>
                  <Input
                    id="specialty"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phoneNumber" className="text-right">
                    Phone Number *
                  </Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">
                    Address
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddDoctor} disabled={!formData.name || !formData.specialty || !formData.phoneNumber}>
                  Add Doctor
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
      
      {/* Doctors List */}
      {isLoadingDoctors ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : !activeCareRecipientId ? (
        <div className="text-center p-8 text-gray-500">
          Please select a care recipient to view their doctors
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No doctors found. Add a doctor to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {doctors.map((doctor: Doctor) => (
            <Card key={doctor.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {doctor.name}
                </CardTitle>
                <CardDescription>
                  <span className="font-medium">Specialty:</span> {doctor.specialty}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>{formatPhoneNumber(doctor.phoneNumber)}</span>
                  </div>
                  {doctor.address && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Address:</span> {doctor.address}
                    </div>
                  )}
                  {doctor.email && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Email:</span> {doctor.email}
                    </div>
                  )}
                  {doctor.notes && (
                    <div className="mt-2 text-sm border-t pt-2">
                      <span className="font-medium">Notes:</span> {doctor.notes}
                    </div>
                  )}
                  {/* Prescription display is handled elsewhere */}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openEditDoctorDialog(doctor.id)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Edit Doctor Dialog */}
      <Dialog open={isEditDoctorOpen} onOpenChange={setIsEditDoctorOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>
              Update the doctor's information below. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name *
              </Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-specialty" className="text-right">
                Specialty *
              </Label>
              <Input
                id="edit-specialty"
                name="specialty"
                value={formData.specialty}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phoneNumber" className="text-right">
                Phone Number *
              </Label>
              <Input
                id="edit-phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-address" className="text-right">
                Address
              </Label>
              <Input
                id="edit-address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input
                id="edit-email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="edit-notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDoctorOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleEditDoctor} 
              disabled={!formData.name || !formData.specialty || !formData.phoneNumber}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onChangeTab={setActiveTab} 
      />
    </div>
  );
}