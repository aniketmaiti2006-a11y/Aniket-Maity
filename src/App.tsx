import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Layers,
  Sun,
  CloudRain,
  Wind,
  Snowflake,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { SimulationState, Season, SEASON_DESCRIPTIONS, CROP_CLASSES } from './types';

// --- Simulation Logic ---
const INITIAL_STATE: SimulationState = {
  currentSeason: 1,
  isTraining: false,
  mode: 'ewc',
  augmentations: {
    rotation: true,
    shear: false,
    zoom: true,
    flip: true,
    elastic: false
  },
  history: {
    naive: [],
    ewc: []
  }
};

// Simulated accuracy decay and learning curves
const getSimulatedAccuracy = (season: Season, trainedUpTo: Season, mode: 'naive' | 'ewc', augmentations: any) => {
  if (season > trainedUpTo) return 10 + Math.random() * 10; // Random low accuracy for unseen tasks
  
  // Augmentation bonus: Improves generalization and baseline
  const augCount = Object.values(augmentations).filter(Boolean).length;
  const augBonus = augCount * 1.2; // Up to ~6% bonus

  const baseAcc = 88 + augBonus + Math.random() * 5;
  const distance = trainedUpTo - season;
  
  if (distance === 0) return Math.min(99, baseAcc);
  
  if (mode === 'naive') {
    // Catastrophic forgetting
    return Math.max(20, baseAcc - (distance * 25) - (Math.random() * 10));
  } else {
    // EWC: maintains much better accuracy on previous tasks
    // Augmentation also helps EWC maintain slightly better stability
    const stabilityBonus = augCount * 0.5;
    return Math.max(80, baseAcc - (distance * (4 - stabilityBonus)) - (Math.random() * 3));
  }
};

export default function App() {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulator' | 'about'>('dashboard');
  const [trainingProgress, setTrainingProgress] = useState(0);

  const runTraining = async () => {
    if (state.currentSeason > 4) return;
    
    setState(prev => ({ ...prev, isTraining: true }));
    setTrainingProgress(0);

    // Simulate training time
    for (let i = 0; i <= 100; i += 5) {
      setTrainingProgress(i);
      await new Promise(r => setTimeout(r, 100));
    }

    // Update history for both modes to compare
    const newNaiveMetrics = Array.from({ length: state.currentSeason }, (_, i) => ({
      season: (i + 1) as Season,
      accuracy: getSimulatedAccuracy((i + 1) as Season, state.currentSeason, 'naive', state.augmentations),
      forgetting: 0,
      timestamp: Date.now()
    }));

    const newEwcMetrics = Array.from({ length: state.currentSeason }, (_, i) => ({
      season: (i + 1) as Season,
      accuracy: getSimulatedAccuracy((i + 1) as Season, state.currentSeason, 'ewc', state.augmentations),
      forgetting: 0,
      timestamp: Date.now()
    }));

    setState(prev => ({
      ...prev,
      isTraining: false,
      currentSeason: (prev.currentSeason + 1) as Season,
      history: {
        naive: [...prev.history.naive, ...newNaiveMetrics],
        ewc: [...prev.history.ewc, ...newEwcMetrics]
      }
    }));
  };

  const resetSimulation = () => {
    setState(INITIAL_STATE);
    setTrainingProgress(0);
  };

  // Prepare data for charts
  const getChartData = () => {
    const seasons = [1, 2, 3, 4];
    return seasons.map(s => {
      const naiveAcc = state.history.naive
        .filter(h => h.season === s)
        .slice(-1)[0]?.accuracy || 0;
      const ewcAcc = state.history.ewc
        .filter(h => h.season === s)
        .slice(-1)[0]?.accuracy || 0;
      
      return {
        name: `Season ${s}`,
        Naive: parseFloat(naiveAcc.toFixed(1)),
        EWC: parseFloat(ewcAcc.toFixed(1)),
      };
    });
  };

  const getForgettingData = () => {
    if (state.currentSeason <= 1) return [];
    // Forgetting is (Max Acc on Season 1 - Current Acc on Season 1)
    const s1NaiveMax = 95; // Assumption
    const s1EwcMax = 95;
    
    const s1NaiveCurrent = state.history.naive.filter(h => h.season === 1).slice(-1)[0]?.accuracy || 95;
    const s1EwcCurrent = state.history.ewc.filter(h => h.season === 1).slice(-1)[0]?.accuracy || 95;

    return [
      { name: 'Naive Fine-tuning', value: Math.max(0, s1NaiveMax - s1NaiveCurrent) },
      { name: 'EWC (Continual)', value: Math.max(0, s1EwcMax - s1EwcCurrent) }
    ];
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header / Navigation */}
      <nav className="border-b border-[#141414] px-6 py-4 flex justify-between items-center bg-[#E4E3E0] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] rounded-sm flex items-center justify-center text-[#E4E3E0]">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight uppercase">AgriLearn AI</h1>
            <p className="text-[10px] font-mono opacity-60 uppercase tracking-widest">Continual Learning Research</p>
          </div>
        </div>
        <div className="flex gap-8">
          {(['dashboard', 'simulator', 'augmentation', 'about'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-xs font-bold uppercase tracking-widest transition-all relative py-1",
                activeTab === tab ? "opacity-100" : "opacity-40 hover:opacity-100"
              )}
            >
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#141414]" 
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stats Overview */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Current Phase" 
                value={`Season ${Math.min(4, state.currentSeason)}`} 
                icon={<TrendingUp size={16} />} 
              />
              <StatCard 
                title="Avg. Accuracy (EWC)" 
                value={`${(getChartData().reduce((a, b) => a + b.EWC, 0) / Math.max(1, state.currentSeason - 1)).toFixed(1)}%`} 
                icon={<CheckCircle2 size={16} />} 
              />
              <StatCard 
                title="Avg. Accuracy (Naive)" 
                value={`${(getChartData().reduce((a, b) => a + b.Naive, 0) / Math.max(1, state.currentSeason - 1)).toFixed(1)}%`} 
                icon={<AlertTriangle size={16} />} 
                trend="negative"
              />
              <StatCard 
                title="Knowledge Retention" 
                value={state.currentSeason > 1 ? "88.4%" : "N/A"} 
                icon={<Layers size={16} />} 
              />
            </div>

            {/* Main Chart */}
            <div className="md:col-span-2 bg-white border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-serif italic text-xl">Performance Across Seasons</h3>
                <div className="flex gap-4 text-[10px] font-mono uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#141414]" /> Naive
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#F27D26]" /> EWC
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontFamily: 'monospace' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#141414', 
                        border: 'none', 
                        borderRadius: '0',
                        color: '#E4E3E0',
                        fontFamily: 'monospace',
                        fontSize: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Naive" 
                      stroke="#141414" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#141414' }} 
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="EWC" 
                      stroke="#F27D26" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#F27D26' }} 
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Forgetting Chart */}
            <div className="bg-white border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
              <h3 className="font-serif italic text-xl mb-8">Catastrophic Forgetting</h3>
              <p className="text-xs opacity-60 mb-6 font-mono uppercase tracking-tighter">Accuracy loss on Season 1 after learning subsequent tasks.</p>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getForgettingData()} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false}
                      width={100}
                      tick={{ fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {getForgettingData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#141414' : '#F27D26'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-3 bg-[#141414] text-[#E4E3E0] text-[10px] font-mono leading-relaxed">
                EWC (Elastic Weight Consolidation) penalizes changes to weights important for previous tasks, effectively "locking" knowledge.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Control Panel */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                <h3 className="font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                  <Layers size={16} /> Training Controls
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-[#E4E3E0] border border-[#141414] rounded-sm">
                    <p className="text-[10px] font-mono uppercase opacity-60 mb-1">Active Season</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xl">Season {Math.min(4, state.currentSeason)}</span>
                      <SeasonIcon season={Math.min(4, state.currentSeason) as Season} />
                    </div>
                    <p className="text-xs mt-2 opacity-80 italic">
                      {SEASON_DESCRIPTIONS[Math.min(4, state.currentSeason) as Season]}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={runTraining}
                      disabled={state.isTraining || state.currentSeason > 4}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 px-4 border border-[#141414] font-bold uppercase text-xs tracking-widest transition-all",
                        state.isTraining || state.currentSeason > 4 
                          ? "opacity-50 cursor-not-allowed bg-gray-100" 
                          : "bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414]"
                      )}
                    >
                      {state.isTraining ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
                      Train Task
                    </button>
                    <button 
                      onClick={resetSimulation}
                      className="flex items-center justify-center gap-2 py-3 px-4 border border-[#141414] font-bold uppercase text-xs tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
                    >
                      <RefreshCw size={14} />
                      Reset
                    </button>
                  </div>

                  {state.isTraining && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-mono uppercase">
                        <span>Optimizing Weights...</span>
                        <span>{trainingProgress}%</span>
                      </div>
                      <div className="h-2 bg-[#E4E3E0] border border-[#141414] overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${trainingProgress}%` }}
                          className="h-full bg-[#141414]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#141414] text-[#E4E3E0] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(242,125,38,1)]">
                <h4 className="font-bold uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                  <Info size={12} /> Methodology Note
                </h4>
                <p className="text-xs leading-relaxed opacity-80">
                  This simulation uses a synthetic distribution shift. Season 1 is the source domain. Seasons 2-4 introduce progressive covariate shift (lighting, noise, blur) to simulate real-world agricultural environmental changes.
                </p>
              </div>
            </div>

            {/* Visualizer */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                <h3 className="font-bold uppercase tracking-widest text-sm mb-6">Data Drift Visualization</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {CROP_CLASSES.map((crop, idx) => (
                    <div key={crop} className="group relative aspect-square border border-[#141414] overflow-hidden bg-gray-100">
                      <img 
                        src={`https://picsum.photos/seed/${crop}-${state.currentSeason}/400/400`} 
                        alt={crop}
                        className={cn(
                          "w-full h-full object-cover transition-all duration-700",
                          state.currentSeason === 2 && "brightness-150 contrast-125",
                          state.currentSeason === 3 && "blur-[1px] brightness-75",
                          state.currentSeason === 4 && "grayscale sepia brightness-90 noise"
                        )}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-[10px] font-mono text-white uppercase tracking-tighter">{crop}</p>
                        <p className="text-[8px] font-mono text-[#F27D26] uppercase">Confidence: {(85 + Math.random() * 10).toFixed(1)}%</p>
                      </div>
                      <div className="absolute top-2 right-2 bg-[#141414] text-[#E4E3E0] text-[8px] font-mono px-1 py-0.5">
                        S{Math.min(4, state.currentSeason)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                <h3 className="font-bold uppercase tracking-widest text-sm mb-4">Training Log</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto font-mono text-[10px]">
                  {state.history.ewc.length === 0 ? (
                    <p className="opacity-40 italic">No training sessions recorded yet...</p>
                  ) : (
                    state.history.ewc.map((log, i) => (
                      <div key={i} className="flex gap-4 py-1 border-b border-gray-100 last:border-0">
                        <span className="opacity-40">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className="font-bold">TASK_S{log.season}</span>
                        <span className="text-green-600">ACC: {log.accuracy.toFixed(2)}%</span>
                        <span className="opacity-60">METHOD: EWC_CONSOLIDATION</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'augmentation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                <h3 className="font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                  <TrendingUp size={16} /> Augmentation Pipeline
                </h3>
                <div className="space-y-4">
                  {(Object.keys(state.augmentations) as Array<keyof typeof state.augmentations>).map((key) => (
                    <label key={key} className="flex items-center justify-between p-3 bg-[#E4E3E0] border border-[#141414] cursor-pointer hover:bg-white transition-colors">
                      <span className="text-xs font-bold uppercase tracking-widest">{key}</span>
                      <input 
                        type="checkbox" 
                        checked={state.augmentations[key]} 
                        onChange={() => setState(prev => ({
                          ...prev,
                          augmentations: { ...prev.augmentations, [key]: !prev.augmentations[key] }
                        }))}
                        className="w-4 h-4 accent-[#141414]"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-[#141414] text-[#E4E3E0] text-[10px] font-mono leading-relaxed">
                  Advanced augmentation increases the model's exposure to varied conditions, improving its ability to generalize across seasonal distribution shifts.
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-white border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                <h3 className="font-bold uppercase tracking-widest text-sm mb-6">Augmentation Preview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square border border-[#141414] overflow-hidden bg-gray-100 relative group">
                      <img 
                        src={`https://picsum.photos/seed/aug-${i}/400/400`} 
                        alt="Augmentation preview"
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-500",
                          state.augmentations.rotation && (i % 2 === 0 ? "rotate-12" : "-rotate-6"),
                          state.augmentations.shear && (i % 3 === 0 ? "skew-x-6" : "skew-y-3"),
                          state.augmentations.zoom && (i % 4 === 0 ? "scale-125" : "scale-110"),
                          state.augmentations.flip && (i % 2 === 0 ? "scale-x-[-1]" : ""),
                          state.augmentations.elastic && "blur-[0.5px] contrast-125 brightness-110"
                        )}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-1 left-1 bg-[#141414] text-[#E4E3E0] text-[8px] font-mono px-1">
                        VAR_{i+1}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border border-[#141414] bg-[#E4E3E0]">
                    <h4 className="font-bold text-xs uppercase mb-2">Generalization Impact</h4>
                    <p className="text-[10px] opacity-70">Augmentation acts as a regularizer, preventing the model from over-fitting to specific seasonal artifacts like lighting angles or camera noise.</p>
                  </div>
                  <div className="p-4 border border-[#141414] bg-[#E4E3E0]">
                    <h4 className="font-bold text-xs uppercase mb-2">EWC Compatibility</h4>
                    <p className="text-[10px] opacity-70">By learning more robust features initially, the Fisher Information Matrix becomes more accurate, allowing EWC to protect the "right" weights.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-3xl mx-auto space-y-12 py-8">
            <section>
              <h2 className="text-4xl font-serif italic mb-6">The Challenge of Seasonal Drift</h2>
              <p className="text-lg leading-relaxed opacity-80 mb-6">
                Agricultural AI models often fail when deployed in the field because the environment is dynamic. A model trained on high-quality spring images will struggle with the harsh shadows of summer or the foggy mornings of autumn.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <div className="space-y-4">
                  <h4 className="font-bold uppercase tracking-widest text-sm border-b border-[#141414] pb-2">Catastrophic Forgetting</h4>
                  <p className="text-sm opacity-70">
                    When a standard neural network is trained on new data (Season 2), it overwrites the weights learned from Season 1. This leads to a total loss of accuracy on the original task.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold uppercase tracking-widest text-sm border-b border-[#141414] pb-2 text-[#F27D26]">Elastic Weight Consolidation</h4>
                  <p className="text-sm opacity-70">
                    EWC identifies which weights are most important for previous tasks using the Fisher Information Matrix. It then adds a penalty to the loss function to prevent these critical weights from changing significantly.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-[#141414] text-[#E4E3E0] p-12 rounded-sm">
              <h3 className="text-2xl font-serif italic mb-8">Project Objectives</h3>
              <ul className="space-y-6">
                {[
                  "Build a robust baseline for crop disease classification.",
                  "Simulate realistic seasonal distribution shifts in agricultural data.",
                  "Implement EWC to enable sequential learning without forgetting.",
                  "Demonstrate the superiority of continual learning over static retraining."
                ].map((obj, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <span className="font-mono text-[#F27D26] text-xl">0{i+1}</span>
                    <p className="text-lg opacity-90">{obj}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-[#141414] p-8 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">
          © 2026 AgriLearn Research Lab • Built with React & Recharts
        </p>
      </footer>
    </div>
  );
}

function StatCard({ title, value, icon, trend = 'neutral' }: { title: string, value: string, icon: React.ReactNode, trend?: 'positive' | 'negative' | 'neutral' }) {
  return (
    <div className="bg-white border border-[#141414] p-4 rounded-sm shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-mono uppercase opacity-60 tracking-widest">{title}</span>
        <div className={cn(
          "p-1.5 rounded-full",
          trend === 'positive' ? "bg-green-100 text-green-700" : 
          trend === 'negative' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
        )}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function SeasonIcon({ season }: { season: Season }) {
  switch (season) {
    case 1: return <Sun className="text-yellow-500" size={20} />;
    case 2: return <Wind className="text-orange-500" size={20} />;
    case 3: return <CloudRain className="text-blue-500" size={20} />;
    case 4: return <Snowflake className="text-cyan-500" size={20} />;
    default: return null;
  }
}
