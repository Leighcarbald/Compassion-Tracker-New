import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useEmergencyAuth() {
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  // Check if emergency verification is still valid
  const { data: isVerified, refetch: checkStatus } = useQuery({
    queryKey: ["/api/emergency-info/verify-status"],
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  });

  // Password verification mutation
  const verifyPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/emergency-reauth", {
        password,
      });
      
      // Check if response is ok before parsing JSON
      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data?.verified) {
        toast({
          title: "Access granted",
          description: "You can now view emergency information.",
        });
        // Invalidate the status query to update the UI
        queryClient.invalidateQueries({ queryKey: ["/api/emergency-info/verify-status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/emergency-info"] });
      } else {
        toast({
          title: "Invalid password",
          description: "Please check your password and try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    isVerified: isVerified?.verified === true,
    isVerifying: verifyPasswordMutation.isPending,
    verifyPassword: verifyPasswordMutation.mutate,
    checkStatus,
  };
}