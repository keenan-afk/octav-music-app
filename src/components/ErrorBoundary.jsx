import React from 'react';
import { RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Octav Player Error Caught:', error, errorInfo);
  }

  handleReset = () => {
    try {
      [
        'octav_liked_tracks',
        'octav_recent_tracks',
        'octav_custom_playlists',
        'spotify_liquid_liked_tracks',
        'spotify_liquid_recent_tracks',
        'spotify_liquid_custom_playlists',
      ].forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Failed clearing cache:', e);
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen bg-[#050507] flex items-center justify-center p-6 select-none font-sans text-white">
          <div className="w-full max-w-[380px] bg-[#121218]/90 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-black tracking-tight mb-2">Octav Restored</h2>
            <p className="text-xs text-white/60 mb-6 leading-relaxed">
              A temporary interface state occurred during live reload. Tap below to refresh Octav player.
            </p>

            <button
              onClick={this.handleReset}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-[#1ed760] to-[#17b14d] text-black font-bold text-sm rounded-full shadow-[0_10px_25px_rgba(30,215,96,0.35)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4 animate-spin-reverse" />
              <span>Restore & Refresh</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

