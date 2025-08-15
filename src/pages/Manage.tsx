
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { useI18n } from '@/contexts/I18nContext';
import { addCard, getAllCards, updateCard, deleteCard, Flashcard } from '@/lib/database';
import { tts } from '@/lib/speech';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

const Manage = () => {
  const { refreshStats } = useApp();
  const { t } = useI18n();
  const { speak, practiceLanguage } = useVoiceSettings();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [newCard, setNewCard] = useState({ french: '', english: '' });
  const [isLoading, setIsLoading] = useState(true);

  const {
    isOpen: isDeleteDialogOpen,
    setIsOpen: setIsDeleteDialogOpen,
    options: deleteDialogOptions,
    confirm: confirmDelete,
    handleConfirm: handleDeleteConfirm,
    handleCancel: handleDeleteCancel,
  } = useConfirmDialog();

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const allCards = await getAllCards();
      setCards(allCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
      toast.error(t('error.load.cards'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCards = cards.filter(card =>
    card.french.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.english.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCard = async () => {
    if (!newCard.french.trim() || !newCard.english.trim()) return;

    try {
      await addCard(newCard.french.trim(), newCard.english.trim());
      setNewCard({ french: '', english: '' });
      await loadCards();
      await refreshStats();
      toast.success(t('success.card.added'));
    } catch (error) {
      console.error('Failed to add card:', error);
      toast.error(t('error.card.add'));
    }
  };

  const handleUpdateCard = async () => {
    if (!editingCard || !editingCard.french.trim() || !editingCard.english.trim()) return;

    try {
      await updateCard(editingCard.id, editingCard.french.trim(), editingCard.english.trim());
      setEditingCard(null);
      await loadCards();
      toast.success(t('success.card.updated'));
    } catch (error) {
      console.error('Failed to update card:', error);
      toast.error(t('error.card.update'));
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const confirmed = await confirmDelete({
      title: t('confirm.delete.card.title'),
      description: t('confirm.delete.card.description'),
      confirmText: t('confirm.delete.card.confirm'),
      cancelText: t('confirm.cancel'),
      variant: 'destructive'
    });

    if (confirmed) {
      try {
        await deleteCard(cardId);
        await loadCards();
        await refreshStats();
        toast.success(t('success.card.deleted'));
      } catch (error) {
        console.error('Failed to delete card:', error);
        toast.error(t('error.card.delete'));
      }
    }
  };

  const speakFrench = (text: string) => {
    // Use the selected practice language instead of hardcoding 'fr'
    speak(text, practiceLanguage);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 pt-24 md:pt-28 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white mb-4">
              <Plus size={24} />
            </div>
            <h1 className="text-2xl font-bold dark:text-white">{t('manage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('manage.subtitle')}</p>
          </div>

          {/* Add New Card */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('manage.add.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="french" className="dark:text-white">{t('manage.french.label')}</Label>
                  <Input
                    id="french"
                    value={newCard.french}
                    onChange={(e) => setNewCard({ ...newCard, french: e.target.value })}
                    placeholder={t('manage.french.placeholder')}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="english" className="dark:text-white">{t('manage.english.label')}</Label>
                  <Input
                    id="english"
                    value={newCard.english}
                    onChange={(e) => setNewCard({ ...newCard, english: e.target.value })}
                    placeholder={t('manage.english.placeholder')}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <Button onClick={handleAddCard} className="w-full">
                <Plus className="mr-2" size={16} />
                {t('manage.add.button')}
              </Button>
            </CardContent>
          </Card>

          {/* Search */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('manage.search.placeholder')}
                  className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cards List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 dark:text-white">{t('manage.loading')}</div>
            ) : filteredCards.length === 0 ? (
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="py-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm ? t('manage.no.match') : t('manage.no.cards')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCards.map((card) => (
                <Card key={card.id} className="dark:bg-gray-800 dark:border-gray-700">
                  <CardContent className="pt-6">
                    {editingCard?.id === card.id ? (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <Input
                            value={editingCard.french}
                            onChange={(e) => setEditingCard({ ...editingCard, french: e.target.value })}
                            placeholder={t('manage.french.placeholder')}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <Input
                            value={editingCard.english}
                            onChange={(e) => setEditingCard({ ...editingCard, english: e.target.value })}
                            placeholder={t('manage.english.placeholder')}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleUpdateCard} size="sm">
                            {t('manage.save')}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingCard(null)}
                            size="sm"
                          >
                            {t('manage.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 grid md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium dark:text-white">{card.french}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => speakFrench(card.french)}
                            >
                              <Volume2 size={14} />
                            </Button>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">{card.english}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCard(card)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCard(card.id)}
                            className="hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
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

export default Manage;
