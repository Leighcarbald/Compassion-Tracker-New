import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabType } from "@/lib/types";
import { format } from "date-fns";
import { Droplets, PlusCircle, Syringe, ArrowDown, ArrowUp, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Glucose, Insulin } from "@shared/schema";
import PageHeader from "@/components/PageHeader";
import BottomNavigation from "@/components/BottomNavigation";
import { useCareRecipient } from "@/hooks/use-care-recipient";
import EditGlucoseInsulinModal from "@/components/EditGlucoseInsulinModal";

interface GlucoseInsulinPageProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function GlucoseInsulinPage({ activeTab, setActiveTab }: GlucoseInsulinPageProps) {
  const { activeCareRecipientId } = useCareRecipient();
  const careRecipientId = activeCareRecipientId ? parseInt(activeCareRecipientId) : null;
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState<"glucose" | "insulin">("glucose");
  const [readingDate, setReadingDate] = useState<Date>(new Date());
  const [readingTime, setReadingTime] = useState(format(new Date(), "HH:mm"));
  
  // Glucose form fields
  const [glucoseLevel, setGlucoseLevel] = useState("");
  const [readingType, setReadingType] = useState("fasting");
  const [glucoseNotes, setGlucoseNotes] = useState("");
  
  // Insulin form fields
  const [insulinUnits, setInsulinUnits] = useState("");
  const [insulinType, setInsulinType] = useState("rapid-acting");
  const [injectionSite, setInjectionSite] = useState("");
  const [insulinNotes, setInsulinNotes] = useState("");
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalType, setEditModalType] = useState<"glucose" | "insulin">("glucose");
  const [selectedRecord, setSelectedRecord] = useState<Glucose | Insulin | null>(null);
  
  const { toast } = useToast();

  const { data: glucoseReadings, isLoading: isLoadingGlucose } = useQuery({
    queryKey: ["/api/glucose", careRecipientId],
    queryFn: async () => {
      const response = await fetch(`/api/glucose?careRecipientId=${careRecipientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch glucose readings");
      }
      return response.json();
    },
    enabled: !!careRecipientId,
  });

  const { data: insulinRecords, isLoading: isLoadingInsulin } = useQuery({
    queryKey: ["/api/insulin", careRecipientId],
    queryFn: async () => {
      const response = await fetch(`/api/insulin?careRecipientId=${careRecipientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch insulin records");
      }
      return response.json();
    },
    enabled: !!careRecipientId,
  });

  const addGlucoseMutation = useMutation({
    mutationFn: async (data: {
      careRecipientId: number;
      level: number;
      timeOfReading: Date;
      readingType: string;
      notes: string;
    }) => {
      const response = await fetch("/api/glucose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to add glucose reading");
      }
      return response.json();
    },
    onSuccess: () => {
      // Reset only the glucose form and hide it (keep insulin form data intact)
      setShowAddForm(false);
      setGlucoseLevel("");
      setReadingType("fasting");
      setGlucoseNotes("");
      
      // Show success toast and invalidate queries
      toast({
        title: "Success",
        description: "Glucose reading added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/glucose", careRecipientId] });
      // Also invalidate today's stats for dashboard updates
      queryClient.invalidateQueries({ queryKey: ["/api/care-stats/today", careRecipientId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addInsulinMutation = useMutation({
    mutationFn: async (data: {
      careRecipientId: number;
      units: number;
      insulinType: string;
      timeAdministered: Date;
      site?: string;
      notes?: string;
    }) => {
      const response = await fetch("/api/insulin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to add insulin record");
      }
      return response.json();
    },
    onSuccess: () => {
      // Reset only the insulin form and hide it (keep glucose form data intact)
      setShowAddForm(false);
      setInsulinUnits("");
      setInsulinType("rapid-acting");
      setInjectionSite("");
      setInsulinNotes("");
      
      // Show success toast and invalidate queries
      toast({
        title: "Success",
        description: "Insulin record added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/insulin", careRecipientId] });
      // Also invalidate today's stats for dashboard updates
      queryClient.invalidateQueries({ queryKey: ["/api/care-stats/today", careRecipientId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitGlucose = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!careRecipientId) {
      toast({
        title: "Error",
        description: "Please select a care recipient",
        variant: "destructive",
      });
      return;
    }
    
    // Validate the form
    if (!glucoseLevel) {
      toast({
        title: "Error",
        description: "Glucose level is required",
        variant: "destructive",
      });
      return;
    }
    
    // Create the timestamp from the date and time
    const timeOfReading = new Date(readingDate);
    const [hours, minutes] = readingTime.split(':').map(Number);
    timeOfReading.setHours(hours, minutes);
    
    // Submit the form data
    addGlucoseMutation.mutate({
      careRecipientId,
      level: Number(glucoseLevel),
      timeOfReading,
      readingType,
      notes: glucoseNotes,
    });
  };

  const handleSubmitInsulin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!careRecipientId) {
      toast({
        title: "Error",
        description: "Please select a care recipient",
        variant: "destructive",
      });
      return;
    }
    
    // Validate the form
    if (!insulinUnits) {
      toast({
        title: "Error",
        description: "Insulin units are required",
        variant: "destructive",
      });
      return;
    }
    
    // Create the timestamp from the date and time
    const timeAdministered = new Date(readingDate);
    const [hours, minutes] = readingTime.split(':').map(Number);
    timeAdministered.setHours(hours, minutes);
    
    // Submit the form data
    addInsulinMutation.mutate({
      careRecipientId,
      units: Number(insulinUnits),
      insulinType,
      timeAdministered,
      site: injectionSite || undefined,
      notes: insulinNotes || undefined,
    });
  };
  
  const getGlucoseStatusColor = (level: number, type: string) => {
    // Different thresholds based on reading type
    if (type === 'fasting') {
      if (level < 70) return "text-red-500"; // Low
      if (level > 130) return "text-red-500"; // High
      return "text-green-500"; // Normal
    } else {
      // Post-meal
      if (level < 70) return "text-red-500"; // Low
      if (level > 180) return "text-red-500"; // High
      return "text-green-500"; // Normal
    }
  };

  const getReadingTypeBadge = (type: string) => {
    switch (type) {
      case 'fasting':
        return <Badge variant="outline">Fasting</Badge>;
      case 'before-meal':
        return <Badge variant="outline">Before Meal</Badge>;
      case 'after-meal':
        return <Badge variant="outline">After Meal</Badge>;
      case 'bedtime':
        return <Badge variant="outline">Bedtime</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getInsulinTypeBadge = (type: string) => {
    switch (type) {
      case 'rapid-acting':
        return <Badge>Rapid-Acting</Badge>;
      case 'short-acting':
        return <Badge>Short-Acting</Badge>;
      case 'intermediate-acting':
        return <Badge>Intermediate</Badge>;
      case 'long-acting':
        return <Badge>Long-Acting</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };
  
  // Handler for opening the edit modal
  const handleEdit = (recordType: "glucose" | "insulin", record: Glucose | Insulin) => {
    setEditModalType(recordType);
    setSelectedRecord(record);
    setEditModalOpen(true);
  };
  
  // Handler for closing the edit modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedRecord(null);
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Glucose & Insulin Tracker" icon={<Droplets className="h-6 w-6" />} />
      
      <div className="flex justify-between items-center mb-6">
        <div></div> {/* Empty div for flex spacing */}
        <Button onClick={() => {
          // Only toggle the visibility, don't reset form data
          setShowAddForm(!showAddForm)
        }}>
          {showAddForm ? "Cancel" : "Add Record"}
          {!showAddForm && <PlusCircle className="ml-2 h-4 w-4" />}
        </Button>
      </div>

      {/* Care recipient selector removed since we're using global context */}

      {showAddForm && (
        <Card className="mb-8">
          <CardHeader>
            <Tabs
              value={formType}
              onValueChange={(value) => {
                // Just update the tab without resetting form data
                setFormType(value as "glucose" | "insulin");
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="glucose" className="relative">
                  <Droplets className="mr-2 h-4 w-4" />
                  Glucose Reading
                  {formType !== "glucose" && glucoseLevel && 
                    <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500" 
                         title="Form data preserved"></div>
                  }
                </TabsTrigger>
                <TabsTrigger value="insulin" className="relative">
                  <Syringe className="mr-2 h-4 w-4" />
                  Insulin Dose
                  {formType !== "insulin" && insulinUnits && 
                    <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500" 
                         title="Form data preserved"></div>
                  }
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {formType === "glucose" ? (
              <form onSubmit={handleSubmitGlucose}>
                <div className="space-y-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="glucoseLevel">Glucose Level (mg/dL)</Label>
                    <Input
                      id="glucoseLevel"
                      type="number"
                      placeholder="120"
                      value={glucoseLevel}
                      onChange={(e) => setGlucoseLevel(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="readingType">Reading Type</Label>
                    <Select value={readingType} onValueChange={setReadingType}>
                      <SelectTrigger id="readingType">
                        <SelectValue placeholder="Select reading type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fasting">Fasting</SelectItem>
                        <SelectItem value="before-meal">Before Meal</SelectItem>
                        <SelectItem value="after-meal">After Meal (2 hours)</SelectItem>
                        <SelectItem value="bedtime">Bedtime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {format(readingDate, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={readingDate}
                            onSelect={(date) => date && setReadingDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={readingTime}
                        onChange={(e) => setReadingTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="glucoseNotes">Notes</Label>
                    <Textarea
                      id="glucoseNotes"
                      placeholder="Add any additional information"
                      value={glucoseNotes}
                      onChange={(e) => setGlucoseNotes(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={addGlucoseMutation.isPending}
                >
                  {addGlucoseMutation.isPending ? "Submitting..." : "Save Glucose Reading"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmitInsulin}>
                <div className="space-y-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="insulinUnits">Insulin Units</Label>
                    <Input
                      id="insulinUnits"
                      type="number"
                      placeholder="10"
                      value={insulinUnits}
                      onChange={(e) => setInsulinUnits(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="insulinType">Insulin Type</Label>
                    <Select value={insulinType} onValueChange={setInsulinType}>
                      <SelectTrigger id="insulinType">
                        <SelectValue placeholder="Select insulin type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rapid-acting">Rapid-Acting</SelectItem>
                        <SelectItem value="short-acting">Short-Acting</SelectItem>
                        <SelectItem value="intermediate-acting">Intermediate-Acting</SelectItem>
                        <SelectItem value="long-acting">Long-Acting</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {format(readingDate, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={readingDate}
                            onSelect={(date) => date && setReadingDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={readingTime}
                        onChange={(e) => setReadingTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="injectionSite">Injection Site</Label>
                    <Input
                      id="injectionSite"
                      placeholder="e.g., Abdomen, Thigh"
                      value={injectionSite}
                      onChange={(e) => setInjectionSite(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insulinNotes">Notes</Label>
                    <Textarea
                      id="insulinNotes"
                      placeholder="Add any additional information"
                      value={insulinNotes}
                      onChange={(e) => setInsulinNotes(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={addInsulinMutation.isPending}
                >
                  {addInsulinMutation.isPending ? "Submitting..." : "Save Insulin Record"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-8">
        {/* Glucose Records */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Droplets className="mr-2 h-5 w-5" />
            Glucose Readings
          </h2>
          
          {isLoadingGlucose ? (
            <div className="text-center py-8">Loading...</div>
          ) : !glucoseReadings || glucoseReadings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No glucose readings recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {glucoseReadings.map((reading: Glucose) => (
                <Card key={reading.id} className="overflow-hidden w-full">
                  <CardHeader className="pb-2 px-4 py-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        <span className={getGlucoseStatusColor(reading.level, reading.readingType)}>
                          {reading.level} mg/dL
                        </span>
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit("glucose", reading)}
                          title="Edit reading"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {reading.level > 130 ? (
                          <ArrowUp className="h-5 w-5 text-red-500" />
                        ) : reading.level < 70 ? (
                          <ArrowDown className="h-5 w-5 text-red-500" />
                        ) : (
                          <Droplets className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {format(new Date(reading.timeOfReading), "MMM d, yyyy 'at' h:mm a")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 py-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Type:</span>
                        <div>
                          {getReadingTypeBadge(reading.readingType)}
                        </div>
                      </div>
                      {reading.notes && (
                        <div className="pt-2 mt-2 border-t border-gray-100">
                          <p className="text-sm text-muted-foreground mb-1">Notes:</p>
                          <p className="text-sm line-clamp-2">{reading.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Insulin Records */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Syringe className="mr-2 h-5 w-5" />
            Insulin Records
          </h2>
          
          {isLoadingInsulin ? (
            <div className="text-center py-8">Loading...</div>
          ) : !insulinRecords || insulinRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No insulin records recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insulinRecords.map((record: Insulin) => (
                <Card key={record.id} className="overflow-hidden w-full">
                  <CardHeader className="pb-2 px-4 py-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {record.units} units
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit("insulin", record)}
                          title="Edit record"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Syringe className="h-5 w-5" />
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {format(new Date(record.timeAdministered), "MMM d, yyyy 'at' h:mm a")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 py-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Type:</span>
                        <div>
                          {getInsulinTypeBadge(record.insulinType)}
                        </div>
                      </div>
                      {record.site && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Site:</span>
                          <span className="capitalize">{record.site}</span>
                        </div>
                      )}
                      {record.notes && (
                        <div className="pt-2 mt-2 border-t border-gray-100">
                          <p className="text-sm text-muted-foreground mb-1">Notes:</p>
                          <p className="text-sm line-clamp-2">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onChangeTab={setActiveTab} 
      />
      
      {/* Edit Modal */}
      {selectedRecord && (
        <EditGlucoseInsulinModal
          type={editModalType}
          isOpen={editModalOpen}
          onClose={handleCloseEditModal}
          data={selectedRecord}
        />
      )}
    </div>
  );
}