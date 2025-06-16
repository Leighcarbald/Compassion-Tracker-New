import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Mail, MessageSquare, Settings } from "lucide-react";

interface NotificationPreferences {
  phone?: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  medicationReminders: boolean;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [medicationReminders, setMedicationReminders] = useState(true);

  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ["/api/user/notifications"],
    enabled: !!user,
    onSuccess: (data) => {
      if (data) {
        setPhone(data.phone || "");
        setEmailNotifications(data.emailNotifications);
        setSmsNotifications(data.smsNotifications);
        setMedicationReminders(data.medicationReminders);
      }
    }
  });

  const updatePreferences = useMutation({
    mutationFn: async (data: NotificationPreferences) => {
      const res = await apiRequest("PUT", "/api/user/notifications", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications"] });
      toast({
        title: "Settings updated!",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (smsNotifications && !phone) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number to enable SMS notifications.",
        variant: "destructive",
      });
      return;
    }

    updatePreferences.mutate({
      phone: phone || undefined,
      emailNotifications,
      smsNotifications,
      medicationReminders,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse">Loading notification settings...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Notification Settings</CardTitle>
                <CardDescription>
                  Configure how you want to receive medication reminders and alerts
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (for SMS)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-gray-600">
                  Include country code (e.g., +1 for US). Required for SMS notifications.
                </p>
              </div>

              {/* Medication Reminders */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-purple-50">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-purple-600" />
                    <div>
                      <Label htmlFor="medication-reminders" className="text-base font-medium">
                        Medication Reminders
                      </Label>
                      <p className="text-sm text-gray-600">
                        Receive notifications when medications are due
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="medication-reminders"
                    checked={medicationReminders}
                    onCheckedChange={setMedicationReminders}
                  />
                </div>

                {medicationReminders && (
                  <div className="ml-6 space-y-4">
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <div>
                          <Label htmlFor="email-notifications" className="text-sm font-medium">
                            Email Notifications
                          </Label>
                          <p className="text-xs text-gray-600">
                            Send reminders to your email address
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>

                    {/* SMS Notifications */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        <div>
                          <Label htmlFor="sms-notifications" className="text-sm font-medium">
                            SMS Notifications
                          </Label>
                          <p className="text-xs text-gray-600">
                            Send reminders to your phone via text message
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="sms-notifications"
                        checked={smsNotifications}
                        onCheckedChange={setSmsNotifications}
                        disabled={!phone}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={updatePreferences.isPending}
                >
                  {updatePreferences.isPending ? "Saving..." : "Save Notification Settings"}
                </Button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">How It Works</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Reminders are sent when medications are scheduled</li>
                <li>• You can choose email, SMS, or both notification methods</li>
                <li>• Turn off reminders completely if you prefer manual tracking</li>
                <li>• All reminders include medication details and dosage information</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}