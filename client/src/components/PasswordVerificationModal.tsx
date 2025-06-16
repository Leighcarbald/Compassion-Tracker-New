import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff } from "lucide-react";

interface PasswordVerificationModalProps {
  isOpen: boolean;
  onVerify: (password: string) => void;
  isVerifying: boolean;
}

export function PasswordVerificationModal({ isOpen, onVerify, isVerifying }: PasswordVerificationModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onVerify(password);
    }
  };

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Verify Your Password
          </DialogTitle>
          <DialogDescription>
            Please enter your account password to access emergency information.
            This helps protect sensitive medical data.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Account Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                className="pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!password.trim() || isVerifying}
            >
              {isVerifying ? "Verifying..." : "Verify Password"}
            </Button>
          </div>
        </form>
        
        <div className="text-xs text-gray-500 mt-4">
          <p>🔒 Your password verification expires after 15 minutes for security.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}