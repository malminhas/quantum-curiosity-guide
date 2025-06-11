import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Target, 
  BarChart3, 
  Zap, 
  AlertCircle, 
  CheckCircle, 
  Activity,
  Info,
  Trash2
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

interface GroverResult {
  target_state: string;
  num_qubits: number;
  optimal_iterations: number;
  shots: number;
  success_rate: number;
  measurements: Record<string, number>;
  circuit_depth: number;
  execution_time_ms: number;
  timestamp: string;
  timing_breakdown?: {
    quantum_execution: number;
    search_api: number;
    analysis_api: number;
    iterations_api: number;
    total_time: number;
  };
}

interface AnalysisResult {
  target_state: string;
  analysis: {
    num_qubits: number;
    search_space_size: number;
    optimal_iterations: number;
    theoretical_success_rate: number;
    classical_average_tries: number;
    quantum_operations: number;
    speedup_factor: number;
  };
  performance_comparison: {
    classical_worst_case: number;
    classical_average_case: number;
    quantum_grover: number;
    advantage: string;
  };
}

interface IterationStep {
  step_name: string;
  iteration_number: number;
  probabilities: Record<string, number>;
  target_probability: number;
}

interface IterationResult {
  target_state: string;
  num_qubits: number;
  optimal_iterations: number;
  search_space_size: number;
  steps: IterationStep[];
  final_amplification: number;
}

// Storage keys for persistence
const STORAGE_KEYS = {
  TARGET_STATE: 'grover_target_state',
  SHOTS: 'grover_shots',
  RESULT: 'grover_result',
  ANALYSIS: 'grover_analysis',
  ITERATIONS: 'grover_iterations'
};

// Helper functions for localStorage
const saveToStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const loadFromStorage = (key: string, defaultValue: any): any => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

const GroverInterface = () => {
  const [targetState, setTargetState] = useState("101010");
  const [shots, setShots] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GroverResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [iterations, setIterations] = useState<IterationResult | null>(null);
  const { toast } = useToast();

  // Load persisted state on component mount
  useEffect(() => {
    const persistedTargetState = loadFromStorage(STORAGE_KEYS.TARGET_STATE, "101010");
    const persistedShots = loadFromStorage(STORAGE_KEYS.SHOTS, 1000);
    const persistedResult = loadFromStorage(STORAGE_KEYS.RESULT, null);
    const persistedAnalysis = loadFromStorage(STORAGE_KEYS.ANALYSIS, null);
    const persistedIterations = loadFromStorage(STORAGE_KEYS.ITERATIONS, null);

    setTargetState(persistedTargetState);
    setShots(persistedShots);
    setResult(persistedResult);
    setAnalysis(persistedAnalysis);
    setIterations(persistedIterations);
  }, [toast]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TARGET_STATE, targetState);
  }, [targetState]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SHOTS, shots);
  }, [shots]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RESULT, result);
  }, [result]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ANALYSIS, analysis);
  }, [analysis]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ITERATIONS, iterations);
  }, [iterations]);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8087";

  // Make qubit limit configurable (can be overridden via environment)
  const MAX_QUBITS = parseInt(import.meta.env.VITE_MAX_QUBITS || "8");
  const MIN_QUBITS = parseInt(import.meta.env.VITE_MIN_QUBITS || "1");

  const validateTargetState = (state: string): boolean => {
    const regex = new RegExp(`^[01]{${MIN_QUBITS},${MAX_QUBITS}}$`);
    return regex.test(state);
  };

  const runCompleteSearch = async () => {
    if (!validateTargetState(targetState)) {
      toast({
        title: "Invalid Target State",
        description: `Please enter a binary string with ${MIN_QUBITS}-${MAX_QUBITS} qubits (e.g., '101', '10101010')`,
        variant: "destructive",
      });
      return;
    }

    if (shots < 100 || shots > 10000) {
      toast({
        title: "Invalid Shots",
        description: "Shots must be between 100 and 10,000",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const startTime = performance.now(); // Start comprehensive timing
    
    try {
      // Step 1: Run the actual Grover search
      console.log(`🚀 API Call: POST ${API_BASE}/grover/search`, { target_state: targetState, shots: shots });
      const searchStart = performance.now();
      const searchResponse = await fetch(`${API_BASE}/grover/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_state: targetState,
          shots: shots,
          backend: "simulator"
        }),
      });

      if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.status}`);
      }

      const searchData: GroverResult = await searchResponse.json();
      const searchTime = performance.now() - searchStart;
      console.log(`✅ Search completed in ${searchTime.toFixed(1)}ms:`, searchData);
      
      // Update the result with accurate total timing - we'll update this at the end
      setResult(searchData);

      // Step 2: Get performance analysis
      console.log(`🚀 API Call: GET ${API_BASE}/grover/analyze/${targetState}`);
      const analysisStart = performance.now();
      const analysisResponse = await fetch(`${API_BASE}/grover/analyze/${targetState}`);
      let analysisTime = 0;
      if (analysisResponse.ok) {
        const analysisData: AnalysisResult = await analysisResponse.json();
        analysisTime = performance.now() - analysisStart;
        console.log(`✅ Analysis completed in ${analysisTime.toFixed(1)}ms:`, analysisData);
        setAnalysis(analysisData);
      }

      // Step 3: Get iteration details (often the slowest part for graph rendering)
      console.log(`🚀 API Call: GET ${API_BASE}/grover/iterations/${targetState}`);
      const iterationsStart = performance.now();
      const iterationsResponse = await fetch(`${API_BASE}/grover/iterations/${targetState}`);
      let iterationsTime = 0;
      if (iterationsResponse.ok) {
        const iterationsData: IterationResult = await iterationsResponse.json();
        iterationsTime = performance.now() - iterationsStart;
        console.log(`✅ Iterations completed in ${iterationsTime.toFixed(1)}ms:`, iterationsData);
        setIterations(iterationsData);
      }
      
      // Calculate total time and update result with comprehensive timing
      const totalTime = performance.now() - startTime;
      const updatedResult = {
        ...searchData,
        execution_time_ms: totalTime, // Override with comprehensive timing
        timing_breakdown: {
          quantum_execution: searchData.execution_time_ms, // Original quantum-only time
          search_api: searchTime,
          analysis_api: analysisTime,
          iterations_api: iterationsTime,
          total_time: totalTime
        }
      };
      setResult(updatedResult);
      
      toast({
        title: "Complete Analysis Finished",
        description: `Search completed with ${searchData.success_rate.toFixed(1)}% success rate in ${totalTime.toFixed(0)}ms. All panels loaded.`,
      });
    } catch (error: any) {
      console.error("Complete search failed:", error);
      toast({
        title: "Search Failed",
        description: "Could not connect to quantum backend. Please ensure the API is running on port 8087.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setAnalysis(null);
    setIterations(null);
    
    // Clear from localStorage
    localStorage.removeItem(STORAGE_KEYS.RESULT);
    localStorage.removeItem(STORAGE_KEYS.ANALYSIS);
    localStorage.removeItem(STORAGE_KEYS.ITERATIONS);
    
    toast({
      title: "Results Cleared",
      description: "All Grover search results have been cleared.",
    });
  };

  const exampleStates = [
    // 1-qubit
    "0", "1", 
    // 2-qubit  
    "00", "01", "10", "11", 
    // 3-qubit
    "000", "001", "010", "011", "100", "101", "110", "111",
    // 4-qubit examples
    "0000", "0101", "1010", "1111",
    // 5-qubit examples  
    "00000", "10101", "01010", "11111",
    // 6-qubit examples
    "000000", "101010", "010101", "111111"
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
          Grover's Quantum Search Algorithm
        </h2>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Experience the quantum advantage! Search unsorted databases with quadratic speedup over classical algorithms. 
          Supports 1-8 qubits (up to 256 possible states).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search Interface */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <Search className="mr-2 h-5 w-5 text-green-400" />
              Quantum Search Configuration
            </CardTitle>
            <CardDescription className="text-slate-300">
              Configure and execute Grover's algorithm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-state" className="text-slate-300">Target State (Binary)</Label>
                <Input
                  id="target-state"
                  value={targetState}
                  onChange={(e) => setTargetState(e.target.value)}
                  placeholder="Enter binary string (e.g., 101)"
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                />
                <p className="text-xs text-slate-400">
                  Valid: {MIN_QUBITS}-{MAX_QUBITS} qubits (e.g., 0, 101, 10101, 10101010)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shots" className="text-slate-300">Number of Shots</Label>
                <Input
                  id="shots"
                  type="number"
                  value={shots}
                  onChange={(e) => setShots(parseInt(e.target.value))}
                  min="100"
                  max="10000"
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                />
                <p className="text-xs text-slate-400">
                  Range: 100-10,000 measurements
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-slate-300">Quick Examples</Label>
                
                {/* Compact grid layout with curated examples */}
                <div className="grid grid-cols-6 gap-1">
                  {[
                    // 1-2 qubits - basic patterns
                    "0", "1", "01", "10", "11",
                    // 3 qubits - corner cases  
                    "000", "101", "111",
                    // 4 qubits - interesting patterns
                    "0000", "0101", "1010", "1111",
                    // 5 qubits - alternating patterns
                    "00000", "10101", "01010", "11111",
                    // 6 qubits - more complex
                    "000000", "101010", "010101", "111111",
                    // 7 qubits - scaling up
                    "0000000", "1010101", "0101010", "1111111",
                    // 8 qubits - maximum complexity
                    "00000000", "10101010", "01010101", "11111111"
                  ].filter(state => state.length <= MAX_QUBITS).map((state) => {
                    const isSelected = state === targetState;
                    const qubitCount = state.length;
                    const colorClass = {
                      1: "border-green-400/50 text-green-300",
                      2: "border-blue-400/50 text-blue-300", 
                      3: "border-purple-400/50 text-purple-300",
                      4: "border-pink-400/50 text-pink-300",
                      5: "border-orange-400/50 text-orange-300",
                      6: "border-yellow-400/50 text-yellow-300",
                      7: "border-red-400/50 text-red-300",
                      8: "border-cyan-400/50 text-cyan-300"
                    }[qubitCount] || "border-slate-400/50 text-slate-300";
                    
                    return (
                      <Button
                        key={state}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTargetState(state)}
                        className={`text-xs px-1 py-1 h-6 ${
                          isSelected
                            ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                            : `${colorClass} hover:bg-blue-600/20`
                        }`}
                        title={`${qubitCount} qubit${qubitCount !== 1 ? 's' : ''} - ${Math.pow(2, qubitCount)} states`}
                      >
                        {state}
                      </Button>
                    );
                  })}
                </div>
                
                {/* Compact legend */}
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex flex-wrap gap-3">
                    <span className="text-green-300">1q</span>
                    <span className="text-blue-300">2q</span>
                    <span className="text-purple-300">3q</span>
                    <span className="text-pink-300">4q</span>
                    <span className="text-orange-300">5q</span>
                    <span className="text-yellow-300">6q</span>
                    <span className="text-red-300">7q</span>
                    <span className="text-cyan-300">8q</span>
                  </div>
                  <p>Hover for search space size • Color indicates qubit count</p>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-600" />

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={runCompleteSearch}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Zap className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Run Complete Search
                    </>
                  )}
                </Button>
                
                {(result || analysis || iterations) && (
                  <Button
                    onClick={clearResults}
                    variant="outline"
                    size="icon"
                    className="border-red-400/50 text-red-300 hover:bg-red-600/20"
                    title="Clear Results"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-slate-600 text-slate-300 hover:bg-slate-600/20"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-600">
                    <DialogHeader>
                      <DialogTitle className="text-slate-100 flex items-center">
                        <Info className="mr-2 h-5 w-5 text-cyan-400" />
                        About Complete Search
                      </DialogTitle>
                      <DialogDescription className="text-slate-300">
                        What happens when you run the complete search
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-slate-200">
                      <p>
                        <strong className="text-cyan-400">Complete Search</strong> executes Grover's quantum search algorithm 
                        and automatically displays all analysis panels:
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <Target className="h-5 w-5 text-purple-400 mt-0.5" />
                          <div>
                            <strong className="text-purple-300">Performance Analysis</strong>
                            <p className="text-sm text-slate-400">
                              Shows theoretical speedup compared to classical search algorithms
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Activity className="h-5 w-5 text-orange-400 mt-0.5" />
                          <div>
                            <strong className="text-orange-300">Algorithm Evolution</strong>
                            <p className="text-sm text-slate-400">
                              Interactive chart showing step-by-step probability amplification
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <BarChart3 className="h-5 w-5 text-green-400 mt-0.5" />
                          <div>
                            <strong className="text-green-300">Search Results</strong>
                            <p className="text-sm text-slate-400">
                              Actual quantum measurement results from the quantum simulator
                            </p>
                          </div>
                        </div>
                      </div>
                      <Alert className="border-cyan-400/50 bg-cyan-600/10">
                        <AlertCircle className="h-4 w-4 text-cyan-400" />
                        <AlertDescription className="text-cyan-200">
                          All API calls are logged to the browser console for debugging and transparency.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysis && (
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Target className="mr-2 h-5 w-5 text-purple-400" />
                Performance Analysis
              </CardTitle>
              <CardDescription className="text-slate-300">
                Theoretical performance for target state: {analysis.target_state}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-slate-400">Search Space</div>
                  <div className="text-lg font-semibold text-slate-200">
                    2^{analysis.analysis.num_qubits} = {analysis.analysis.search_space_size}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-400">Optimal Iterations</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {analysis.analysis.optimal_iterations}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-400">Success Rate</div>
                  <div className="text-lg font-semibold text-green-400">
                    {analysis.analysis.theoretical_success_rate.toFixed(1)}%
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-400">Speedup Factor</div>
                  <div className="text-lg font-semibold text-blue-400">
                    {analysis.analysis.speedup_factor.toFixed(1)}x
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-600" />

              <div>
                <h4 className="font-semibold text-slate-200 mb-3">Performance Comparison</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Classical (worst case)</span>
                    <div className="text-right">
                      <Badge variant="outline" className="border-red-400/50 text-red-300">
                        {analysis.performance_comparison.classical_worst_case} tries
                      </Badge>
                      <div className="text-xs text-red-300/70 mt-1">
                        ~{(analysis.performance_comparison.classical_worst_case * 0.001).toFixed(analysis.performance_comparison.classical_worst_case >= 1000 ? 1 : 3)}ms
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Classical (average)</span>
                    <div className="text-right">
                      <Badge variant="outline" className="border-yellow-400/50 text-yellow-300">
                        {analysis.performance_comparison.classical_average_case} tries
                      </Badge>
                      <div className="text-xs text-yellow-300/70 mt-1">
                        ~{(analysis.performance_comparison.classical_average_case * 0.001).toFixed(analysis.performance_comparison.classical_average_case >= 1000 ? 1 : 3)}ms
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Quantum (Grover's)</span>
                    <div className="text-right">
                      <Badge variant="outline" className="border-green-400/50 text-green-300">
                        {analysis.performance_comparison.quantum_grover} iterations
                      </Badge>
                      <div className="text-xs text-green-300/70 mt-1">
                        ~{(analysis.performance_comparison.quantum_grover * 0.1).toFixed(1)}ms
                      </div>
                    </div>
                  </div>
                </div>
                
                <Alert className="mt-4 border-blue-400/50 bg-blue-600/10">
                  <CheckCircle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-200">
                    {analysis.performance_comparison.advantage}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Iteration Evolution Chart */}
        {iterations && (
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Activity className="mr-2 h-5 w-5 text-orange-400" />
                Algorithm Evolution
              </CardTitle>
              <CardDescription className="text-slate-300">
                Probability evolution through Grover iterations for {iterations.target_state}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-slate-400">Amplification</div>
                  <div className="text-lg font-semibold text-orange-400">
                    {iterations.final_amplification}x
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-400">Total Steps</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {iterations.steps.length}
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-600" />

              {/* Chart Visualization */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={iterations.steps.map((step, index) => ({
                      step: index,
                      stepName: step.step_name.replace(/^(Oracle|Diffusion|Initial): /, ''),
                      probability: step.target_probability * 100,
                      iteration: step.iteration_number,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="step" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickFormatter={(value) => `${value}`}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#F3F4F6'
                      }}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)}%`,
                        'Target Probability'
                      ]}
                      labelFormatter={(label: number) => {
                        const step = iterations.steps[label];
                        return `${step?.step_name || 'Step'} (Iteration ${step?.iteration_number || 0})`;
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="probability" 
                      stroke="#FB923C" 
                      strokeWidth={3}
                      dot={{ fill: '#FB923C', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#FB923C', strokeWidth: 2 }}
                      name="Target Probability"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <Alert className="border-orange-400/50 bg-orange-600/10">
                <Activity className="h-4 w-4 text-orange-400" />
                <AlertDescription className="text-orange-200">
                  Final target probability increased from {(100 / iterations.search_space_size).toFixed(1)}% to {(iterations.steps[iterations.steps.length - 1].target_probability * 100).toFixed(1)}%
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}



        {/* Search Results */}
        {result && (
          <Card className="lg:col-span-3 bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-green-400" />
                Search Results
              </CardTitle>
              <CardDescription className="text-slate-300">
                Quantum measurement results from {result.shots} shots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center space-y-2">
                  <div className="text-sm text-slate-400">Success Rate</div>
                  <div className="text-2xl font-bold text-green-400">
                    {result.success_rate.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-sm text-slate-400">Total Time</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {result.execution_time_ms.toFixed(0)}ms
                  </div>
                  {result.timing_breakdown && (
                    <div className="text-xs text-slate-500">
                      Quantum: {result.timing_breakdown.quantum_execution.toFixed(0)}ms
                    </div>
                  )}
                </div>
                <div className="text-center space-y-2">
                  <div className="text-sm text-slate-400">Circuit Depth</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {result.circuit_depth}
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-sm text-slate-400">Iterations</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {result.optimal_iterations}
                  </div>
                </div>
              </div>

              {/* Enhanced Timing Breakdown */}
              {result.timing_breakdown && (
                <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-sm font-semibold text-slate-300 mb-3">⏱️ Performance Breakdown</div>
                  
                  {/* Primary Operations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-green-300 font-medium text-sm">🔍 Quantum Search</span>
                        <span className="text-green-400 font-bold">{result.timing_breakdown.quantum_execution.toFixed(1)}ms</span>
                      </div>
                      <div className="text-xs text-green-200/80">
                        Actual algorithm execution - the "fast" part
                      </div>
                    </div>
                    
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-orange-300 font-medium text-sm">📊 Visualization Generation</span>
                        <span className="text-orange-400 font-bold">{result.timing_breakdown.iterations_api.toFixed(1)}ms</span>
                      </div>
                      <div className="text-xs text-orange-200/80">
                        Step-by-step data for Algorithm Evolution graph
                      </div>
                    </div>
                  </div>
                  
                  {/* Secondary Operations */}
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-600 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Performance Analysis:</span>
                      <span className="text-blue-400">{result.timing_breakdown.analysis_api.toFixed(1)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Network/UI:</span>
                      <span className="text-purple-400">
                        {(result.timing_breakdown.total_time - result.timing_breakdown.search_api - result.timing_breakdown.analysis_api - result.timing_breakdown.iterations_api).toFixed(1)}ms
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 rounded p-2">
                    💡 <strong>Why the difference?</strong> The quantum search is extremely fast, but generating detailed step-by-step visualization data requires simulating the entire algorithm multiple times to track probability evolution.
                  </div>
                </div>
              )}

              <Separator className="bg-slate-600" />

              <div>
                <h4 className="font-semibold text-slate-200 mb-4">Measurement Distribution</h4>
                <div className="space-y-3">
                  {Object.entries(result.measurements)
                    .sort(([, a], [, b]) => b - a)
                    .map(([state, count]) => {
                      const percentage = (count / result.shots) * 100;
                      const isTarget = state === result.target_state;
                      return (
                        <div key={state} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`font-mono ${isTarget ? 'text-green-400 font-bold' : 'text-slate-300'}`}>
                              |{state}⟩ {isTarget && '(TARGET)'}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`${isTarget ? 'border-green-400/50 text-green-300' : 'border-slate-500 text-slate-300'}`}
                            >
                              {count} ({percentage.toFixed(1)}%)
                            </Badge>
                          </div>
                          <Progress 
                            value={percentage} 
                            className={`h-2 ${isTarget ? 'bg-green-900/30' : 'bg-slate-700'}`}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-700">
                Executed at: {new Date(result.timestamp).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Algorithm Explanation */}
      <Card className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-slate-600">
        <CardHeader>
          <CardTitle className="text-slate-100">How Grover's Algorithm Works</CardTitle>
          <CardDescription className="text-slate-300">
            Understanding the quantum search advantage and the oracle concept
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Concept */}
          <Alert className="border-amber-400/50 bg-amber-600/10">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-200">
              <strong>Key Insight:</strong> The algorithm doesn't know the answer - the oracle (black box) does! 
              Grover's algorithm amplifies the probability of finding whatever state the oracle marks, 
              without knowing what that state is beforehand.
            </AlertDescription>
          </Alert>

          {/* The Oracle Concept */}
          <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-orange-300 flex items-center">
              <Target className="mr-2 h-4 w-4" />
              The Oracle Mystery
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Think of the oracle as a "black box" that can instantly recognize the target item when it sees it, 
              but can't tell you what or where it is. The oracle flips the phase of the target state, 
              essentially "marking" it without revealing its location. The algorithm then uses quantum interference 
              to amplify this marked state through repeated iterations.
            </p>
          </div>

          {/* Algorithm Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-300 flex items-center">
                <Zap className="mr-2 h-4 w-4" />
                1. Initialization
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Create equal superposition of all possible states using Hadamard gates. 
                Every state starts with equal probability - complete uncertainty about where the target is.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-purple-300 flex items-center">
                <Activity className="mr-2 h-4 w-4" />
                2. Oracle + Diffusion
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                The oracle "marks" the target by flipping its phase (invisible to probability). 
                The diffusion operator then performs "inversion about average," rotating the probability 
                amplitudes to increase the target's chance of being measured.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-green-300 flex items-center">
                <BarChart3 className="mr-2 h-4 w-4" />
                3. Measurement
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                After optimal iterations (~√N), the target state has maximum probability. 
                Measurement collapses the quantum superposition, revealing the target with high probability.
              </p>
            </div>
          </div>

          {/* How it Works in Practice */}
          <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-cyan-300">How Quantum Interference Creates the Speedup</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              The magic happens through quantum interference. Each iteration rotates the probability amplitudes 
              in a way that constructively amplifies the target state while destructively interfering with non-target states. 
              This geometric rotation in the quantum amplitude space creates the quadratic speedup - 
              instead of checking items one by one (classical), we rotate toward the answer in √N steps.
            </p>
          </div>
          
          {/* Quantum Advantage */}
          {/* Performance scaling information */}
          <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-purple-300">Scalability & Performance</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">4 qubits</div>
                <div className="text-slate-400">16 states</div>
                <div className="text-green-400">3 iterations</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">5 qubits</div>
                <div className="text-slate-400">32 states</div>
                <div className="text-green-400">4 iterations</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">6 qubits</div>
                <div className="text-slate-400">64 states</div>
                <div className="text-green-400">6 iterations</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">8 qubits</div>
                <div className="text-slate-400">256 states</div>
                <div className="text-green-400">12 iterations</div>
              </div>
            </div>
          </div>
          
          <Alert className="border-cyan-400/50 bg-cyan-600/10">
            <AlertCircle className="h-4 w-4 text-cyan-400" />
            <AlertDescription className="text-cyan-200">
              <strong>Quantum Advantage:</strong> Grover's algorithm provides a quadratic speedup, requiring only O(√N) 
              operations compared to O(N) for classical search. For a database of 1 million items, classical search 
              needs ~500,000 queries on average, while Grover's needs only ~1,000 quantum operations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroverInterface;
