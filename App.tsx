import React from 'react';
import GameEngine from './components/GameEngine';

const App: React.FC = () => {
  return (
    <div className="antialiased">
      <GameEngine />
    </div>
  );
};

export default App;