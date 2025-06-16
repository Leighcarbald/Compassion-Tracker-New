import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { ShieldAlert, User, Mail, Lock, ArrowLeft } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    name: "",
    termsAccepted: false
  });
  
  const { toast } = useToast();
  const { user, loginMutation, registerMutation } = useAuth();

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      loginMutation.mutate({
        username: formData.username,
        password: formData.password
      });
    } else {
      // Validate password strength on frontend
      if (formData.password.length < 6) {
        toast({
          title: "Password too short",
          description: "Password must be at least 6 characters long",
          variant: "destructive"
        });
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure your passwords match",
          variant: "destructive"
        });
        return;
      }

      if (!formData.termsAccepted) {
        toast({
          title: "Terms acceptance required",
          description: "Please accept the terms of use and privacy policy to continue",
          variant: "destructive"
        });
        return;
      }
      
      registerMutation.mutate({
        username: formData.username,
        password: formData.password,
        name: formData.name || formData.username,
        email: formData.email
      });
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username) {
      toast({
        title: "Username required",
        description: "Please enter your username to reset your password",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/forgot-password", {
        username: formData.username
      });
      
      if (response.ok) {
        toast({
          title: "Password reset email sent!",
          description: "Check your email for password reset instructions",
        });
        setShowForgotPassword(false);
        setFormData(prev => ({ ...prev, username: "" }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {showForgotPassword ? "Reset Password" : isLogin ? "Sign In" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-center">
              {showForgotPassword 
                ? "Enter your username to receive a password reset email"
                : isLogin 
                  ? "Access your care management dashboard" 
                  : "Start managing your family's care today"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  Send Reset Email
                </Button>
                
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Login
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  required
                />
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-600">Required for password recovery</p>
                  </div>
                </>
              )}
              

              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required
                />
                {!isLogin && (
                  <div className="text-xs text-gray-600 space-y-1 mt-2">
                    <p className="font-medium">Password must contain:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>At least 8 characters</li>
                      <li>One uppercase letter (A-Z)</li>
                      <li>One lowercase letter (a-z)</li>
                      <li>One number (0-9)</li>
                      <li>One special character (!@#$%^&*)</li>
                    </ul>
                  </div>
                )}
              </div>
              
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    required
                  />
                </div>
              )}

              {!isLogin && (
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={(e) => handleInputChange("termsAccepted", e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      required
                    />
                    <div className="text-sm text-gray-700">
                      <label htmlFor="termsAccepted" className="block">
                        I understand that <strong>Compassion Tracker</strong> is a caregiving support tool and is not intended to diagnose, treat, or replace professional medical advice. I agree to use this app voluntarily and accept the{" "}
                        <a href="https://www.compassiontracker.org/terms-of-use" target="_blank" className="text-blue-600 hover:text-blue-800 underline">
                          Terms of Use
                        </a>{" "}
                        and{" "}
                        <a href="https://www.compassiontracker.org/privacy-policy" target="_blank" className="text-blue-600 hover:text-blue-800 underline">
                          Privacy Policy
                        </a>.
                      </label>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 bg-white p-2 rounded border-l-4 border-blue-400">
                    <strong>Medical Disclaimer:</strong> This application is designed to help families organize and track care information. Always consult with healthcare professionals for medical decisions and emergency situations.
                  </div>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending || registerMutation.isPending}
              >
                {(loginMutation.isPending || registerMutation.isPending) ? (
                  "Please wait..."
                ) : (
                  isLogin ? "Sign In" : "Create Account"
                )}
              </Button>

              {isLogin && (
                <div className="text-center mt-2">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-blue-600"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot your password?
                  </Button>
                </div>
              )}
            </form>
            )}
            
            {!showForgotPassword && (
              <div className="mt-6 text-center">
                <Button
                  variant="link"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm"
                >
                  {isLogin 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"
                  }
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}