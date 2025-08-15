
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Download, Upload, Trash2, Volume2, Moon, Sun, Monitor } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n, Language } from '@/contexts/I18nContext';
import { exportData, importData, clearAllData } from '@/lib/database';
import { tts, SupportedLanguage, VoiceOption } from '@/lib/speech';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';
import BulkImport from '@/components/BulkImport';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

const Settings = () => {
  const { refreshStats } = useApp();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const { 
    practiceLanguage, 
    selectedVoice, 
    setPracticeLanguage, 
    setSelectedVoice, 
    isVoicesLoaded,
    speak 
  } = useVoiceSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  
  const {
    isOpen: isDeleteDialogOpen,
    setIsOpen: setIsDeleteDialogOpen,
    options: deleteDialogOptions,
    confirm: confirmDelete,
    handleConfirm: handleDeleteConfirm,
    handleCancel: handleDeleteCancel,
  } = useConfirmDialog();

  const updateVoices = async () => {
    try {
      await tts.waitForVoices();
      const voices = await tts.getAvailableVoicesForLanguage(practiceLanguage);
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Error updating voices:', error);
    }
  };

  useEffect(() => {
    updateVoices();
    
    // Listen for voice changes
    const unsubscribe = tts.onVoiceChange(() => {
      updateVoices();
    });

    return unsubscribe;
  }, [practiceLanguage]);

  const handleVoiceChange = async (voiceName: string) => {
    try {
      // Stop any currently playing audio before changing voice
      tts.stop();
      await setSelectedVoice(voiceName);
    } catch (error) {
      console.error('Error changing voice:', error);
      toast.error(t('error.voice.change'));
    }
  };

  const testVoice = async () => {
    if (isTestingVoice) return;
    
    setIsTestingVoice(true);
    try {
      const testPhrase = t(`test.phrase.${practiceLanguage}`);
      await speak(testPhrase, practiceLanguage);
    } catch (error) {
      console.error('Error testing voice:', error);
      toast.error(t('error.voice.test'));
    } finally {
      // Reset after a delay to prevent rapid clicking
      setTimeout(() => setIsTestingVoice(false), 1000);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flashcards-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('success.export'));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('error.export'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      await refreshStats();
      toast.success(t('success.import'));
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(t('error.import'));
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleClearAll = async () => {
    const confirmed = await confirmDelete({
      title: t('confirm.delete.all.title'),
      description: t('confirm.delete.all.description'),
      confirmText: t('confirm.delete.all.confirm'),
      cancelText: t('confirm.cancel'),
      variant: 'destructive'
    });

    if (confirmed) {
      try {
        await clearAllData();
        await refreshStats();
        toast.success(t('success.delete.all'));
      } catch (error) {
        console.error('Clear all failed:', error);
        toast.error(t('error.delete.all'));
      }
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={16} />;
      case 'dark': return <Moon size={16} />;
      default: return <Monitor size={16} />;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 pt-24 md:pt-28 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white mb-4">
              <SettingsIcon size={24} />
            </div>
            <h1 className="text-2xl font-bold dark:text-white">{t('settings.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>
          </div>

          {/* Language & Theme Settings */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('settings.language.title')}</CardTitle>
              <CardDescription className="dark:text-gray-400">
                {t('settings.language.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-white">{t('settings.language.title')}</Label>
                  <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-white">{t('settings.theme')}</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <div className="flex items-center gap-2">
                        {getThemeIcon()}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun size={16} />
                          {t('settings.theme.light')}
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon size={16} />
                          {t('settings.theme.dark')}
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor size={16} />
                          {t('settings.theme.system')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('settings.voice.title')}</CardTitle>
              <CardDescription className="dark:text-gray-400">
                {t('settings.voice.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-white">{t('settings.practice.language')}</Label>
                  <Select value={practiceLanguage} onValueChange={(value: SupportedLanguage) => setPracticeLanguage(value)}>
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-white">{t('settings.voice.selection')}</Label>
                  <div className="flex gap-2">
                    <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                      <SelectTrigger className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder={t('settings.voice.loading')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVoices.map((voice) => (
                          <SelectItem key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </SelectItem>
                        ))}
                        {availableVoices.length === 0 && (
                          <SelectItem value="default" disabled>
                            {t('settings.voice.loading')}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                     <Button 
                      variant="outline" 
                      onClick={testVoice}
                      disabled={isTestingVoice || !isVoicesLoaded}
                      className="dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      <Volume2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('settings.voice.description')}
              </p>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('settings.data.title')}</CardTitle>
              <CardDescription className="dark:text-gray-400">
                {t('settings.data.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bulk Import */}
              <div className="space-y-2">
                <Label className="dark:text-white">{t('settings.bulk.import')}</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings.bulk.subtitle')}
                </p>
                <BulkImport onImportComplete={refreshStats} />
              </div>

              {/* Export */}
              <div className="space-y-2">
                <Label className="dark:text-white">{t('settings.export.title')}</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings.export.description')}
                </p>
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="mr-2" size={16} />
                  {isExporting ? t('settings.export.loading') : t('settings.export')}
                </Button>
              </div>

              {/* Import */}
              <div className="space-y-2">
                <Label htmlFor="import-file" className="dark:text-white">{t('settings.import')}</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings.import.description')}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    disabled={isImporting}
                    className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <Upload className="text-gray-400" size={16} />
                </div>
                {isImporting && (
                  <p className="text-sm text-blue-600 dark:text-blue-400">{t('settings.import.loading')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('settings.about')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium dark:text-white">{t('home.title')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings.about.description')}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium dark:text-white">{t('settings.about.features')}</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• {t('settings.about.feature.spaced')}</li>
                  <li>• {t('settings.about.feature.offline')}</li>
                  <li>• {t('settings.about.feature.voice')}</li>
                  <li>• {t('settings.about.feature.dark')}</li>
                  <li>• {t('settings.about.feature.i18n')}</li>
                  <li>• {t('settings.about.feature.progress')}</li>
                  <li>• {t('settings.about.feature.bulk')}</li>
                  <li>• {t('settings.about.feature.import')}</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-800 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">{t('settings.danger')}</CardTitle>
              <CardDescription className="dark:text-gray-400">
                {t('settings.danger.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleClearAll}
                className="w-full"
              >
                <Trash2 className="mr-2" size={16} />
                {t('settings.delete.all')}
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('settings.danger.warning')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={deleteDialogOptions.title}
        description={deleteDialogOptions.description}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText={deleteDialogOptions.confirmText}
        cancelText={deleteDialogOptions.cancelText}
        variant={deleteDialogOptions.variant}
      />
    </>
  );
};

export default Settings;
