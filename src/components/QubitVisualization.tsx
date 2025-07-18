import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Zap, Binary } from "lucide-react";

// Storage keys for persistence
const QUBIT_STORAGE_KEYS = {
  AMPLITUDE0: 'qubit_amplitude0',
  AMPLITUDE1: 'qubit_amplitude1', 
  PHASE: 'qubit_phase',
  ACTIVE_PRESET: 'qubit_active_preset'
};

// Helper functions for localStorage
const saveQubitToStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save qubit to localStorage:', error);
  }
};

const loadQubitFromStorage = (key: string, defaultValue: any): any => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn('Failed to load qubit from localStorage:', error);
    return defaultValue;
  }
};

const QubitVisualization = () => {
  const [amplitude0, setAmplitude0] = useState([0.7]);
  const [amplitude1, setAmplitude1] = useState([0.7]);
  const [phase, setPhase] = useState([0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Load persisted qubit state on component mount
  useEffect(() => {
    const persistedAmplitude0 = loadQubitFromStorage(QUBIT_STORAGE_KEYS.AMPLITUDE0, [0.7]);
    const persistedAmplitude1 = loadQubitFromStorage(QUBIT_STORAGE_KEYS.AMPLITUDE1, [0.7]);
    const persistedPhase = loadQubitFromStorage(QUBIT_STORAGE_KEYS.PHASE, [0]);
    const persistedActivePreset = loadQubitFromStorage(QUBIT_STORAGE_KEYS.ACTIVE_PRESET, null);

    setAmplitude0(persistedAmplitude0);
    setAmplitude1(persistedAmplitude1);
    setPhase(persistedPhase);
    setActivePreset(persistedActivePreset);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveQubitToStorage(QUBIT_STORAGE_KEYS.AMPLITUDE0, amplitude0);
  }, [amplitude0]);

  useEffect(() => {
    saveQubitToStorage(QUBIT_STORAGE_KEYS.AMPLITUDE1, amplitude1);
  }, [amplitude1]);

  useEffect(() => {
    saveQubitToStorage(QUBIT_STORAGE_KEYS.PHASE, phase);
  }, [phase]);

  useEffect(() => {
    saveQubitToStorage(QUBIT_STORAGE_KEYS.ACTIVE_PRESET, activePreset);
  }, [activePreset]);

  // Normalize amplitudes to ensure |α|² + |β|² = 1
  const normalizeAmplitudes = (a0: number, a1: number) => {
    const magnitude = Math.sqrt(a0 * a0 + a1 * a1);
    if (magnitude === 0) return { norm_a0: 1, norm_a1: 0 };
    return { norm_a0: a0 / magnitude, norm_a1: a1 / magnitude };
  };

  const { norm_a0, norm_a1 } = normalizeAmplitudes(amplitude0[0], amplitude1[0]);
  const prob0 = norm_a0 * norm_a0;
  const prob1 = norm_a1 * norm_a1;

  // Check if current state matches any preset or set to "Random"
  useEffect(() => {
    if (!isAnimating) {
      const tolerance = 0.01;
      let matchesPreset = false;
      
      for (const preset of presetStates) {
        const { norm_a0: preset_a0, norm_a1: preset_a1 } = normalizeAmplitudes(preset.a0, preset.a1);
        if (
          Math.abs(norm_a0 - preset_a0) <= tolerance &&
          Math.abs(norm_a1 - preset_a1) <= tolerance &&
          Math.abs(phase[0] - preset.phase) <= 1
        ) {
          if (activePreset !== preset.name) {
            setActivePreset(preset.name);
          }
          matchesPreset = true;
          break;
        }
      }
      
      // If no preset matches, mark as "Random" (unless we're already random or null)
      if (!matchesPreset && activePreset !== "Random") {
        setActivePreset("Random");
      }
    }
  }, [amplitude0, amplitude1, phase, activePreset, isAnimating]);

  const presetStates = [
    { name: "|0⟩", a0: 1, a1: 0, phase: 0, description: "Classical 0 state" },
    { name: "|1⟩", a0: 0, a1: 1, phase: 0, description: "Classical 1 state" },
    { name: "|+⟩", a0: 0.707, a1: 0.707, phase: 0, description: "Equal superposition" },
    { name: "|-⟩", a0: 0.707, a1: 0.707, phase: 180, description: "Opposite phase superposition" },
  ];

  const applyPreset = (preset: typeof presetStates[0]) => {
    setAmplitude0([preset.a0]);
    setAmplitude1([preset.a1]);
    setPhase([preset.phase]);
    setActivePreset(preset.name);
  };

  const animateRandomState = () => {
    setIsAnimating(true);
    setActivePreset("Random"); // Set to Random when randomizing
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    
    const targetA0 = Math.random();
    const targetA1 = Math.random();
    const targetPhase = Math.random() * 360;
    
    let step = 0;
    const timer = setInterval(() => {
      const progress = step / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      setAmplitude0([amplitude0[0] + (targetA0 - amplitude0[0]) * easeProgress]);
      setAmplitude1([amplitude1[0] + (targetA1 - amplitude1[0]) * easeProgress]);
      setPhase([phase[0] + (targetPhase - phase[0]) * easeProgress]);
      
      step++;
      if (step >= steps) {
        clearInterval(timer);
        setIsAnimating(false);
      }
    }, interval);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Interactive Qubit Visualization
        </h2>
        <div className="max-w-4xl mx-auto space-y-3">
          <p className="text-slate-300 text-lg">
            Explore how qubits exist in superposition and understand quantum state representation using the Bloch sphere
          </p>
          <p className="text-slate-400 text-sm">
            The <strong className="text-purple-300">Bloch sphere</strong> is a geometric representation that visualizes all possible states of a single qubit. 
            Unlike classical bits that are either 0 or 1, qubits can exist in <strong className="text-cyan-300">superposition</strong> - 
            simultaneously both 0 and 1 until measured. The sphere's surface represents all pure quantum states, 
            with the north pole as |0⟩, south pole as |1⟩, and the equator representing equal superposition states like |+⟩ and |-⟩.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Qubit State Controls */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <Zap className="mr-2 h-5 w-5 text-purple-400" />
              Qubit State Controls
            </CardTitle>
            <CardDescription className="text-slate-300 space-y-2">
              <span className="block">Adjust the quantum state: |ψ⟩ = α|0⟩ + βe^(iφ)|1⟩</span>
              <span className="block text-xs text-slate-400 mt-2">
                <strong className="text-purple-300">Amplitudes (α, β)</strong> determine the probability of measuring |0⟩ or |1⟩. 
                <strong className="text-cyan-300">Phase (φ)</strong> creates interference effects crucial for quantum algorithms.
                The amplitudes are automatically normalized so |α|² + |β|² = 1.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Amplitude for |0⟩ (α): {norm_a0.toFixed(3)}
                </label>
                <Slider
                  value={amplitude0}
                  onValueChange={setAmplitude0}
                  max={1}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Amplitude for |1⟩ (β): {norm_a1.toFixed(3)}
                </label>
                <Slider
                  value={amplitude1}
                  onValueChange={setAmplitude1}
                  max={1}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Phase (φ): {phase[0].toFixed(1)}°
                </label>
                <Slider
                  value={phase}
                  onValueChange={setPhase}
                  max={360}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {presetStates.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className={`border-purple-400/50 text-purple-200 hover:bg-purple-600/20 transition-all duration-300 ${
                    activePreset === preset.name 
                      ? 'bg-purple-600/40 border-purple-300 text-purple-100 shadow-lg shadow-purple-500/25' 
                      : ''
                  }`}
                >
                  {preset.name}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={animateRandomState}
                disabled={isAnimating}
                className={`border-cyan-400/50 text-cyan-200 hover:bg-cyan-600/20 transition-all duration-300 ${
                  activePreset === "Random" 
                    ? 'bg-cyan-600/40 border-cyan-300 text-cyan-100 shadow-lg shadow-cyan-500/25' 
                    : ''
                }`}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Random
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bloch Sphere Visualization */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Bloch Sphere</CardTitle>
            <CardDescription className="text-slate-300 space-y-2">
              <span className="block">3D representation of qubit state showing position on the quantum sphere</span>
              <span className="block text-xs text-slate-400 mt-2">
                The <strong className="text-purple-300">purple dot</strong> represents your qubit state. 
                <strong className="text-cyan-300">Top/bottom</strong> = |0⟩/|1⟩ states, 
                <strong className="text-green-300">left/right</strong> = |-⟩/|+⟩ superposition states.
                Distance from center shows "purity" - pure states are on the surface.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full h-64 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-600 overflow-hidden">
              {/* Simplified 2D Bloch sphere representation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-48 h-48">
                  {/* Circle representing the Bloch sphere */}
                  <div className="w-full h-full border-2 border-slate-500 rounded-full relative">
                    {/* Equator line */}
                    <div className="absolute top-1/2 left-0 w-full h-px bg-slate-600"></div>
                    {/* Vertical line */}
                    <div className="absolute left-1/2 top-0 w-px h-full bg-slate-600"></div>
                    
                    {/* State vector */}
                    <div 
                      className="absolute w-4 h-4 bg-purple-400 rounded-full transition-all duration-700 ease-out"
                      style={{
                        left: `${50 + 40 * Math.cos(phase[0] * Math.PI / 180) * norm_a1}%`,
                        top: `${50 - 40 * (norm_a0 - norm_a1)}%`,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: `0 0 15px rgba(168, 85, 247, 0.9), 0 0 30px rgba(168, 85, 247, 0.5)`
                      }}
                    >
                      <div className="absolute inset-0 bg-purple-300 rounded-full animate-pulse opacity-70"></div>
                      <div className="absolute inset-1 bg-purple-200 rounded-full opacity-50"></div>
                    </div>
                    
                    {/* Axis labels */}
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-slate-400">|0⟩</div>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-slate-400">|1⟩</div>
                    <div className="absolute top-1/2 -right-8 transform -translate-y-1/2 text-xs text-slate-400">+</div>
                    <div className="absolute top-1/2 -left-8 transform -translate-y-1/2 text-xs text-slate-400">-</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Measurement Probabilities */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <Binary className="mr-2 h-5 w-5 text-cyan-400" />
              Measurement Probabilities
            </CardTitle>
            <CardDescription className="text-slate-300">
              When measured, the qubit will collapse to |0⟩ or |1⟩ with these probabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-300">P(|0⟩) = |α|²</span>
                    <Badge variant="outline" className="border-blue-400/50 text-blue-300">
                      {(prob0 * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${prob0 * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-300">P(|1⟩) = |β|²</span>
                    <Badge variant="outline" className="border-purple-400/50 text-purple-300">
                      {(prob1 * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-400 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${prob1 * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-200">Current State:</h4>
                <div className="bg-slate-900/50 p-4 rounded-lg font-mono text-sm text-slate-300">
                  |ψ⟩ = {norm_a0.toFixed(3)}|0⟩ + {norm_a1.toFixed(3)}e^(i{(phase[0] * Math.PI / 180).toFixed(2)})|1⟩
                </div>
                <div className="text-xs text-slate-400">
                  Normalization: |α|² + |β|² = {(prob0 + prob1).toFixed(3)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QubitVisualization;
