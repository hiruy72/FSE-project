import React from 'react';
import { User, Users, Shield } from 'lucide-react';

const DemoLoginHelper = ({ onDemoLogin }) => {
  const demoAccounts = [
    {
      email: 'hiruy.ugr-1838-16@aau.edu.et',
      password: 'demo123',
      role: 'mentee',
      name: 'Hiruy Tesfaye (AAU Student)',
      icon: User,
      description: 'Computer Science student at Addis Ababa University'
    },
    {
      email: 'sarah.chen@aau.edu.et',
      password: 'demo123',
      role: 'mentor',
      name: 'Sarah Chen (Mentor)',
      icon: Users,
      description: 'Computer Science lecturer with React & Node.js expertise'
    },
    {
      email: 'admin@aau.edu.et',
      password: 'demo123',
      role: 'admin',
      name: 'Demo Admin',
      icon: Shield,
      description: 'Access admin features and platform management'
    }
  ];

  return (
    <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
      <h3 className="text-white font-semibold mb-3 text-center">🎮 Demo Accounts</h3>
      <p className="text-dark-400 text-sm mb-4 text-center">
        Click any account below to login instantly
      </p>
      
      <div className="space-y-2">
        {demoAccounts.map((account, index) => {
          const Icon = account.icon;
          return (
            <button
              key={index}
              onClick={() => onDemoLogin(account.email, account.password)}
              className="w-full bg-dark-600 hover:bg-dark-500 rounded-lg p-3 text-left transition-colors duration-200 border border-dark-500 hover:border-primary-500"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-primary-600 p-2 rounded-lg">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">{account.name}</div>
                  <div className="text-dark-400 text-xs">{account.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-dark-600">
        <p className="text-dark-400 text-xs text-center">
          💡 Or register a new account - any email/password works in demo mode
        </p>
      </div>
    </div>
  );
};

export default DemoLoginHelper;