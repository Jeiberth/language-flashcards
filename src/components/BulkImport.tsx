
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { addCard } from '@/lib/database';

interface BulkImportProps {
  onImportComplete: () => void;
}

const BulkImport: React.FC<BulkImportProps> = ({ onImportComplete }) => {
  const [text, setText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleBulkImport = async () => {
    if (!text.trim()) return;

    setIsImporting(true);
    try {
      const lines = text.split('\n').filter(line => line.trim());
      let successCount = 0;
      let errorCount = 0;
      const errorLines: string[] = [];

      for (const line of lines) {
        try {
          // Support multiple formats: "french:english", "french - english", "french | english"
          const separators = [':', ' - ', ' | ', '\t'];
          let french = '';
          let english = '';

          for (const separator of separators) {
            if (line.includes(separator)) {
              const parts = line.split(separator).map(part => part.trim());
              if (parts.length >= 2) {
                french = parts[0];
                english = parts[1];
                break;
              }
            }
          }

          if (french && english) {
            await addCard(french, english);
            successCount++;
          } else {
            errorCount++;
            errorLines.push(line);
            console.warn('Could not parse line:', line);
          }
        } catch (error) {
          errorCount++;
          errorLines.push(line);
          console.error('Error importing line:', line, error);
        }
      }

      // Show custom toast notification instead of browser popup
      if (successCount > 0 && errorCount === 0) {
        toast.success(
          `Import completed successfully!`, 
          {
            description: `Successfully imported ${successCount} cards.`,
            duration: 4000,
            icon: <CheckCircle className="text-green-500" size={20} />,
          }
        );
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(
          `Import partially completed`, 
          {
            description: `Successfully imported ${successCount} cards. ${errorCount} entries could not be imported.`,
            duration: 5000,
            icon: <AlertCircle className="text-yellow-500" size={20} />,
          }
        );
      } else {
        toast.error(
          `Import failed`, 
          {
            description: `Could not import any cards. Please check your formatting.`,
            duration: 5000,
            icon: <XCircle className="text-red-500" size={20} />,
          }
        );
      }

      if (successCount > 0) {
        setText('');
        setIsOpen(false);
        onImportComplete();
      }
    } catch (error) {
      console.error('Bulk import failed:', error);
      toast.error(
        'Import failed', 
        {
          description: 'An unexpected error occurred. Please try again.',
          duration: 5000,
          icon: <XCircle className="text-red-500" size={20} />,
        }
      );
    } finally {
      setIsImporting(false);
    }
  };

  const exampleText = `bonjour : hello
au revoir : goodbye
merci : thank you
s'il vous plaît : please
excusez-moi : excuse me`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <FileText className="mr-2" size={16} />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Cards</DialogTitle>
          <DialogDescription>
            Add multiple flashcards at once by entering them in the text area below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Format Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-600">
                Enter one card per line using any of these formats:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <code>french : english</code></li>
                <li>• <code>french - english</code></li>
                <li>• <code>french | english</code></li>
                <li>• <code>french [tab] english</code></li>
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cards to Import</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={exampleText}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Lines: {text.split('\n').filter(line => line.trim()).length}
            </p>
          </div>

          {text.split('\n').some(line => line.trim() && !line.includes(':') && !line.includes(' - ') && !line.includes(' | ') && !line.includes('\t')) && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertCircle className="text-yellow-600" size={16} />
              <p className="text-sm text-yellow-800">
                Some lines may not be properly formatted. Make sure each line contains a separator.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleBulkImport}
              disabled={!text.trim() || isImporting}
              className="flex-1"
            >
              <Plus className="mr-2" size={16} />
              {isImporting ? 'Importing...' : 'Import Cards'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImport;
