import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Smartphone, Monitor, CheckCircle, ArrowLeft } from "lucide-react";

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-2" />
            <CardTitle className="text-2xl">App Installed!</CardTitle>
            <CardDescription>UCU Attendance is ready to use from your home screen.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
      <Button variant="ghost" onClick={() => navigate("/")} className="absolute top-4 left-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="text-center mb-4">
        <Download className="w-12 h-12 text-primary mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-foreground">Install UCU Attendance</h1>
        <p className="text-muted-foreground mt-2">Install the app on your device for quick access</p>
      </div>

      {/* Android / Desktop Chrome install button */}
      {deferredPrompt && (
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" /> Install Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="w-4 h-4 mr-2" /> Install App
            </Button>
          </CardContent>
        </Card>
      )}

      {/* iOS instructions */}
      {isIOS && !deferredPrompt && (
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" /> Install on iPhone / iPad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">1</span>
              <p className="text-sm text-foreground">Tap the <strong>Share</strong> button (box with arrow) at the bottom of Safari</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">2</span>
              <p className="text-sm text-foreground">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">3</span>
              <p className="text-sm text-foreground">Tap <strong>"Add"</strong> to install the app</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Android fallback instructions */}
      {isAndroid && !deferredPrompt && (
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" /> Install on Android
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">1</span>
              <p className="text-sm text-foreground">Tap the <strong>⋮ menu</strong> (three dots) in your browser</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">2</span>
              <p className="text-sm text-foreground">Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">3</span>
              <p className="text-sm text-foreground">Tap <strong>"Install"</strong> to confirm</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop fallback */}
      {!isIOS && !isAndroid && !deferredPrompt && (
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" /> Install on Desktop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Look for the <strong>install icon</strong> in your browser's address bar, or use the browser menu to install this app.
            </p>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={() => { localStorage.setItem("install-dismissed", "true"); navigate("/auth"); }} className="mt-4">
        Continue without installing
      </Button>
    </div>
  );
};

export default Install;
