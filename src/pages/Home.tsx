
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Brain, Download, Repeat, Volume2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useI18n } from '@/contexts/I18nContext';

const Home = () => {
  const { stats } = useApp();
  const { t } = useI18n();

  const features = [
    {
      icon: Brain,
      title: t('home.features.spaced.title'),
      description: t('home.features.spaced.desc')
    },
    {
      icon: Volume2,
      title: t('home.features.tts.title'),
      description: t('home.features.tts.desc')
    },
    {
      icon: Repeat,
      title: t('home.features.offline.title'),
      description: t('home.features.offline.desc')
    },
    {
      icon: Download,
      title: t('home.features.import.title'),
      description: t('home.features.import.desc')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 pt-24 md:pt-28 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6 py-12">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white mb-4">
            <BookOpen size={32} />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('home.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>
          
          {stats.totalCards > 0 ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                <Link to="/review">{t('home.continue.learning')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/dashboard">{t('home.view.progress')}</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                <Link to="/manage">{t('home.create.first')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/settings">{t('home.import.existing')}</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {stats.totalCards > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalCards}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('home.stats.total')}</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.dueToday}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('home.stats.due')}</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.reviewedToday}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('home.stats.reviewed')}</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.masteryPercentage}%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('home.stats.mastery')}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                    <feature.icon size={24} />
                  </div>
                  <CardTitle className="text-lg dark:text-white">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base dark:text-gray-400">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl dark:text-white">{t('home.how.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto font-bold text-xl">
                  1
                </div>
                <h3 className="font-semibold dark:text-white">{t('home.how.step1')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('home.how.step1.desc')}</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto font-bold text-xl">
                  2
                </div>
                <h3 className="font-semibold dark:text-white">{t('home.how.step2')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('home.how.step2.desc')}</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto font-bold text-xl">
                  3
                </div>
                <h3 className="font-semibold dark:text-white">{t('home.how.step3')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('home.how.step3.desc')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
