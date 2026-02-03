'use client';

import { useState, useEffect } from 'react';

interface Stats {
  totalDeclined: number;
  lastRun: string;
  pendingRequests: number;
}

interface FilterSettings {
  minAccountAge: number;
  maxFriends: number;
  minFriends: number;
  checkDescription: boolean;
  suspiciousPatterns: string[];
  enabled: boolean;
}

export default function Home() {
  const [cookie, setCookie] = useState('');
  const [stats, setStats] = useState<Stats>({ totalDeclined: 0, lastRun: 'Never', pendingRequests: 0 });
  const [filters, setFilters] = useState<FilterSettings>({
    minAccountAge: 30,
    maxFriends: 10,
    minFriends: 0,
    checkDescription: true,
    suspiciousPatterns: ['discord.gg', 't.me', 'free robux', 'visit', 'click here'],
    enabled: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.cookie) setCookie(data.cookie);
        if (data.filters) setFilters(data.filters);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie, filters })
      });
      
      if (res.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      setMessage('Error saving settings');
    }
    setLoading(false);
  };

  const runNow = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/decline', {
        method: 'POST'
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage(`Declined ${data.declined} friend requests`);
        loadStats();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Error running decliner');
    }
    setLoading(false);
  };

  const addPattern = () => {
    const pattern = prompt('Enter suspicious pattern to detect:');
    if (pattern) {
      setFilters({
        ...filters,
        suspiciousPatterns: [...filters.suspiciousPatterns, pattern.toLowerCase()]
      });
    }
  };

  const removePattern = (index: number) => {
    setFilters({
      ...filters,
      suspiciousPatterns: filters.suspiciousPatterns.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Roblox Friend Request Bot Decliner</h1>
        <p className="text-gray-300 mb-8">Automatically decline suspicious friend requests</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-3xl font-bold text-white">{stats.totalDeclined}</div>
            <div className="text-gray-300 text-sm">Total Declined</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-3xl font-bold text-white">{stats.pendingRequests}</div>
            <div className="text-gray-300 text-sm">Pending Requests</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-lg font-bold text-white">{stats.lastRun}</div>
            <div className="text-gray-300 text-sm">Last Run</div>
          </div>
        </div>

        {/* Roblox Cookie */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Roblox Authentication</h2>
          <label className="block text-gray-300 mb-2">
            .ROBLOSECURITY Cookie
          </label>
          <input
            type="password"
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
            placeholder="Paste your .ROBLOSECURITY cookie here"
            className="w-full bg-white/5 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
          />
          <p className="text-xs text-gray-400 mt-2">
            Find this in your browser cookies while logged into Roblox. Never share this with anyone!
          </p>
        </div>

        {/* Filter Settings */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Bot Detection Filters</h2>
          
          <div className="mb-4">
            <label className="flex items-center text-white mb-4">
              <input
                type="checkbox"
                checked={filters.enabled}
                onChange={(e) => setFilters({ ...filters, enabled: e.target.checked })}
                className="mr-2 w-4 h-4"
              />
              <span className="font-semibold">Enable Auto-Decline</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">Min Account Age (days)</label>
              <input
                type="number"
                value={filters.minAccountAge}
                onChange={(e) => setFilters({ ...filters, minAccountAge: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/30 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Max Friends Count</label>
              <input
                type="number"
                value={filters.maxFriends}
                onChange={(e) => setFilters({ ...filters, maxFriends: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/30 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>

          <label className="flex items-center text-white mb-4">
            <input
              type="checkbox"
              checked={filters.checkDescription}
              onChange={(e) => setFilters({ ...filters, checkDescription: e.target.checked })}
              className="mr-2 w-4 h-4"
            />
            Check profile description for suspicious patterns
          </label>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-300">Suspicious Patterns</label>
              <button
                onClick={addPattern}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                + Add Pattern
              </button>
            </div>
            <div className="space-y-2">
              {filters.suspiciousPatterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                  <span className="text-white">{pattern}</span>
                  <button
                    onClick={() => removePattern(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={runNow}
            disabled={loading || !cookie}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            {loading ? 'Running...' : 'Run Now'}
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-500/20 border border-red-500' : 'bg-green-500/20 border border-green-500'}`}>
            <p className="text-white">{message}</p>
          </div>
        )}

        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mt-6">
          <p className="text-yellow-200 text-sm">
            <strong>Security Note:</strong> Your cookie is stored securely and never shared. 
            Set up a cron job (via Vercel Cron or external service) to hit /api/decline regularly for automation.
          </p>
        </div>
      </div>
    </div>
  );
}
