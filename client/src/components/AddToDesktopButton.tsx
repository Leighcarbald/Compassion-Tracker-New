import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function AddToDesktopButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show if not installable
  if (!isInstallable || !deferredPrompt) {
    return null;
  }

  return (
    <Button
      onClick={handleInstallClick}
      variant="outline"
      size="sm"
      className="flex items-center space-x-2 bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Add to Desktop</span>
      <span className="sm:hidden">Install</span>
    </Button>
  );
}

// Alternative component for iOS Safari users (since PWA install works differently)
export function IOSInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /ipad|iphone|ipod/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    setIsIOS(isIOSDevice);
    setIsInStandaloneMode(isStandalone);
  }, []);

  if (!isIOS || isInStandaloneMode) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 m-4">
      <div className="flex items-start space-x-3">
        <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <h4 className="font-medium text-blue-900">Install Compassion Tracker</h4>
          <p className="text-sm text-blue-700 mt-1">
            To install this app on your iPhone/iPad:
          </p>
          <ol className="text-xs text-blue-600 mt-2 space-y-1">
            <li>1. Tap the Share button in Safari</li>
            <li>2. Scroll down and tap "Add to Home Screen"</li>
            <li>3. Tap "Add" to install the app</li>
          </ol>
        </div>
      </div>
    </div>
  );
}