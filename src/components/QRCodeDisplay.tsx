import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";

interface QRCodeDisplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecture: any;
}

const QRCodeDisplay = ({ open, onOpenChange, lecture }: QRCodeDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    const generateQR = async () => {
      if (open && lecture?.qr_code_data) {
        try {
          const url = await QRCode.toDataURL(lecture.qr_code_data, {
            width: 300,
            margin: 2,
            color: {
              dark: "#3b82f6",
              light: "#ffffff",
            },
          });
          setQrDataUrl(url);
        } catch (error) {
          console.error("Error generating QR code:", error);
        }
      }
    };
    generateQR();
  }, [open, lecture]);

  const handleDownload = () => {
    if (qrDataUrl) {
      const link = document.createElement("a");
      link.download = `${lecture.course_code}-${format(new Date(lecture.scheduled_time), "yyyy-MM-dd")}.png`;
      link.href = qrDataUrl;
      link.click();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lecture?.title}</DialogTitle>
          <DialogDescription>
            {lecture?.course_code} - {format(new Date(lecture?.scheduled_time || new Date()), "PPp")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-[300px] h-[300px]" />
            ) : (
              <div className="w-[300px] h-[300px] flex items-center justify-center text-muted-foreground">
                Generating QR code...
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm text-center">
            <p className="font-medium">Venue: {lecture?.venue}</p>
            <p className="text-muted-foreground">
              Students should scan this QR code to mark their attendance
            </p>
          </div>

          <Button onClick={handleDownload} className="w-full gap-2">
            <Download className="w-4 h-4" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeDisplay;
