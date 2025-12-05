import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OfflineScreen = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 p-6">
      <div className="flex flex-col items-center text-center max-w-md">
        {/* App Icon */}
        <img 
          src="/app-icon.png" 
          alt="App Icon" 
          className="w-24 h-24 rounded-2xl shadow-2xl mb-8"
        />
        
        {/* WiFi Off Icon */}
        <div className="bg-white/20 rounded-full p-4 mb-6">
          <WifiOff className="w-12 h-12 text-white" />
        </div>
        
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Você está sem conexão
        </h1>
        
        {/* Subtitle */}
        <p className="text-white/80 text-base md:text-lg mb-8">
          Verifique sua conexão com a internet e tente novamente
        </p>
        
        {/* Retry Button */}
        <Button 
          onClick={handleRetry}
          className="bg-white text-emerald-700 hover:bg-white/90 font-semibold px-8 py-6 text-lg rounded-xl shadow-lg transition-all hover:scale-105"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
};

export default OfflineScreen;
