
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Home, BarChart3, BookOpen, Plus, Settings } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

const Navigation = () => {
  const location = useLocation();
  const { t } = useI18n();

  const navItems = [
    { path: '/', icon: Home, label: t('nav.home') },
    { path: '/dashboard', icon: BarChart3, label: t('nav.dashboard') },
    { path: '/review', icon: BookOpen, label: t('nav.review') },
    { path: '/manage', icon: Plus, label: t('nav.manage') },
    { path: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <>
      {/* Desktop Topbar */}
      <Card className="hidden md:block fixed top-4 left-4 right-4 z-50 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" style={{ width: '50px', height: 'auto' }}/>
            <span className="font-bold text-lg dark:text-white">{t('home.title')}</span>
          </div>
          <div className="flex gap-2">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Button
                key={path}
                variant={location.pathname === path ? 'default' : 'ghost'}
                size="sm"
                asChild
                className={location.pathname === path ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
              >
                <Link to={path} className="flex items-center gap-2">
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Mobile Top Bar */}
      <Card className="md:hidden fixed top-4 left-4 right-4 z-50 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex justify-between items-center p-2">
          <div className="flex items-center gap-2">
            <BookOpen className="text-blue-600 dark:text-blue-400" size={20} />
            <span className="font-bold text-sm dark:text-white">{t('home.title')}</span>
          </div>
          <div className="flex gap-1">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Button
                key={path}
                variant={location.pathname === path ? 'default' : 'ghost'}
                size="sm"
                asChild
                className={`px-2 ${location.pathname === path ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <Link to={path} className="flex items-center gap-1">
                  <Icon size={14} />
                  <span className="hidden sm:inline text-xs">{label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
};

export default Navigation;
