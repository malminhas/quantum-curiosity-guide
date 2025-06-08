
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Search, Target, BarChart3, Clock, Zap, AlertCircle, CheckCircle } from "lucide-react";

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

const GroverInterface = () => {
  const [targetState, setTargetState] = useState("101");
  const [shots, setShots] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GroverResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const API_BASE = "http://localhost:8086";

  const validateTargetState = (state: string): boolean => {
    return /^[01]{1,3}$/.test(state);
  };

  const runGroverSearch = async () => {
    if (!validateTargetState(targetState)) {
      toast({
        title: "Invalid Target State",
        description: "Please enter a binary string with 1-3 qubits (e.g., '101')",
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
    try {
      const response = await fetch(`${API_BASE}/grover/search`, {
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GroverResult = await response.json();
      setResult(data);
      
      toast({
        title: "Grover Search Completed",
        description: `Found target state with ${data.success_rate.toFixed(1)}% success rate`,
      });
    } catch (error) {
      console.error("Grover search failed:", error);
      toast({
        title: "Search Failed",
        description: "Could not connect to quantum backend. Please ensure the API is running on port 8086.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeTargetState = async () => {
    if (!validateTargetState(targetState)) {
      toast({
        title: "Invalid Target State",
        description: "Please enter a binary string with 1-3 qubits",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/grover/analyze/${targetState}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze target state. Please check the API connection.",
        variant: "destructive",
      });
    }
  };

  const exampleStates = ["0", "1", "00", "01", "10", "11", "000", "001", "010", "011", "100", "101", "110", "111"];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
          Grover's Quantum Search Algorithm
        </h2>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Experience the quantum advantage! Search unsorted databases with quadratic speedup over classical algorithms.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                  Valid: 1-3 qubits (0, 1, 00-11, 000-111)
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

              <div className="space-y-2">
                <Label className="text-slate-300">Quick Examples</Label>
                <div className="flex flex-wrap gap-2">
                  {exampleStates.map((state) => (
                    <Button
                      key={state}
                      variant="outline"
                      size="sm"
                      onClick={() => setTargetState(state)}
                      className="border-blue-400/50 text-blue-200 hover:bg-blue-600/20"
                    >
                      {state}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Separator className="bg-slate-600" />

            <div className="flex space-x-3">
              <Button
                onClick={runGroverSearch}
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
                    Run Search
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={analyzeTargetState}
                className="border-purple-400/50 text-purple-200 hover:bg-purple-600/20"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyze
              </Button>
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
                    <Badge variant="outline" className="border-red-400/50 text-red-300">
                      {analysis.performance_comparison.classical_worst_case} tries
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Classical (average)</span>
                    <Badge variant="outline" className="border-yellow-400/50 text-yellow-300">
                      {analysis.performance_comparison.classical_average_case} tries
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Quantum (Grover's)</span>
                    <Badge variant="outline" className="border-green-400/50 text-green-300">
                      {analysis.performance_comparison.quantum_grover} iterations
                    </Badge>
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

        {/* Search Results */}
        {result && (
          <Card className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border-slate-700">
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
                  <div className="text-sm text-slate-400">Execution Time</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {result.execution_time_ms.toFixed(1)}ms
                  </div>
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
            Understanding the quantum search advantage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-300">1. Initialization</h4>
              <p className="text-sm text-slate-400">
                Create equal superposition of all possible states using Hadamard gates
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-300">2. Oracle + Diffusion</h4>
              <p className="text-sm text-slate-400">
                Repeatedly apply oracle (marks target) and diffusion operator (amplifies marked state)
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-300">3. Measurement</h4>
              <p className="text-sm text-slate-400">
                After optimal iterations, measure to find target state with high probability
              </p>
            </div>
          </div>
          
          <Alert className="border-cyan-400/50 bg-cyan-600/10">
            <AlertCircle className="h-4 w-4 text-cyan-400" />
            <AlertDescription className="text-cyan-200">
              <strong>Quantum Advantage:</strong> Grover's algorithm provides a quadratic speedup, requiring only O(√N) 
              operations compared to O(N) for classical search, where N is the size of the search space.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroverInterface;
