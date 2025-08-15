
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { useI18n } from '@/contexts/I18nContext';
import { BarChart3, BookOpen, Target, TrendingUp, Zap, Award } from 'lucide-react';

const Dashboard = () => {
  const { stats } = useApp();
  const { t } = useI18n();

  const statCards = [
    {
      title: t('dashboard.stats.total'),
      value: stats.totalCards,
      icon: BookOpen,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      description: t('dashboard.stats.total.desc')
    },
    {
      title: t('dashboard.stats.due'),
      value: stats.dueToday,
      icon: Target,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900',
      description: t('dashboard.stats.due.desc')
    },
    {
      title: t('dashboard.stats.reviewed'),
      value: stats.reviewedToday,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      description: t('dashboard.stats.reviewed.desc')
    },
    {
      title: t('dashboard.stats.streak'),
      value: stats.currentStreak,
      icon: Zap,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      description: t('dashboard.stats.streak.desc')
    },
    {
      title: t('dashboard.stats.mastery'),
      value: `${stats.masteryPercentage}%`,
      icon: Award,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900',
      description: t('dashboard.stats.mastery.desc')
    }
  ];

  const getMotivationalMessage = () => {
    if (stats.dueToday === 0) {
      return t('dashboard.motivation.caught_up');
    }
    if (stats.dueToday <= 5) {
      return t('dashboard.motivation.few_cards');
    }
    if (stats.dueToday <= 20) {
      return t('dashboard.motivation.good_momentum');
    }
    return t('dashboard.motivation.dive_in');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 pt-24 md:pt-28 pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white mb-4">
            <BarChart3 size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('dashboard.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {getMotivationalMessage()}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:scale-105 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium dark:text-white">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold dark:text-white">{stat.value}</div>
                <CardDescription className="text-xs dark:text-gray-400">{stat.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress Insights */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Target className="text-green-600 dark:text-green-400" size={20} />
                {t('dashboard.goal.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.dueToday === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">{t('dashboard.goal.caught_up')}</p>
                  <p className="text-gray-600 dark:text-gray-400">{t('dashboard.goal.no_cards')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm dark:text-gray-300">
                    <span>{t('dashboard.goal.progress')}</span>
                    <span>{stats.reviewedToday}/{stats.dueToday + stats.reviewedToday}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, (stats.reviewedToday / (stats.dueToday + stats.reviewedToday)) * 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.dueToday} {t('dashboard.goal.remaining')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Award className="text-indigo-600 dark:text-indigo-400" size={20} />
                {t('dashboard.mastery.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm dark:text-gray-300">
                  <span>{t('dashboard.mastery.level')}</span>
                  <span>{stats.masteryPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${stats.masteryPercentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.round((stats.masteryPercentage / 100) * stats.totalCards)} {t('dashboard.mastery.of')} {stats.totalCards} {t('dashboard.mastery.mastered')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">{t('dashboard.actions.title')}</CardTitle>
            <CardDescription className="dark:text-gray-400">{t('dashboard.actions.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="p-4 rounded-lg border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center">
                <BookOpen className="mx-auto mb-2 text-blue-600 dark:text-blue-400" size={24} />
                <div className="text-sm font-medium dark:text-white">{t('dashboard.actions.review')}</div>
              </button>
              <button className="p-4 rounded-lg border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center">
                <Target className="mx-auto mb-2 text-green-600 dark:text-green-400" size={24} />
                <div className="text-sm font-medium dark:text-white">{t('dashboard.actions.add')}</div>
              </button>
              <button className="p-4 rounded-lg border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center">
                <BarChart3 className="mx-auto mb-2 text-purple-600 dark:text-purple-400" size={24} />
                <div className="text-sm font-medium dark:text-white">{t('dashboard.actions.stats')}</div>
              </button>
              <button className="p-4 rounded-lg border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center">
                <Award className="mx-auto mb-2 text-orange-600 dark:text-orange-400" size={24} />
                <div className="text-sm font-medium dark:text-white">{t('dashboard.actions.settings')}</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
