import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

interface DocumentSettings {
  pageSize: 'letter' | 'a4' | 'legal' | '4x6';
  orientation: 'portrait' | 'landscape';
  margins: 'normal' | 'narrow' | 'wide';
}

interface DocumentSettingsModalProps {
  settings: DocumentSettings;
  onSettingsChange: (settings: DocumentSettings) => void;
}

export default function DocumentSettingsModal({ settings, onSettingsChange }: DocumentSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<DocumentSettings>(settings);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    onSettingsChange(localSettings);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Page Setup
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Page Size */}
          <div className="space-y-2">
            <Label htmlFor="page-size">Page Size</Label>
            <Select
              value={localSettings.pageSize}
              onValueChange={(value: 'letter' | 'a4' | 'legal' | '4x6') =>
                setLocalSettings(prev => ({ ...prev, pageSize: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="letter">Letter (8.5" × 11")</SelectItem>
                <SelectItem value="a4">A4 (210mm × 297mm)</SelectItem>
                <SelectItem value="legal">Legal (8.5" × 14")</SelectItem>
                <SelectItem value="4x6">4" × 6"</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orientation */}
          <div className="space-y-2">
            <Label htmlFor="orientation">Orientation</Label>
            <Select
              value={localSettings.orientation}
              onValueChange={(value: 'portrait' | 'landscape') =>
                setLocalSettings(prev => ({ ...prev, orientation: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Margins */}
          <div className="space-y-2">
            <Label htmlFor="margins">Margins</Label>
            <Select
              value={localSettings.margins}
              onValueChange={(value: 'normal' | 'narrow' | 'wide') =>
                setLocalSettings(prev => ({ ...prev, margins: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="narrow">Narrow (0.5")</SelectItem>
                <SelectItem value="normal">Normal (1.0")</SelectItem>
                <SelectItem value="wide">Wide (1.5")</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Apply Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}