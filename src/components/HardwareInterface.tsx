import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, 
  Key, 
  AlertCircle,
  Cpu,
  Network,
  Thermometer,
  Clock,
  Atom,
  Server,
  CheckCircle,
  Wifi,
  PlayCircle,
  Shield
} from "lucide-react";

interface IBMHardwareInfo {
  backend_name: string;
  backend_version: string;
  num_qubits: number;
  operational: boolean;
  pending_jobs: number;
  basis_gates: string[];
  coupling_map: number[][];
}

interface IBMJobResult {
  job_id: string;
  status: string;
  backend_name: string;
  creation_date: string;
  queue_position?: number;
  estimated_completion_time?: string;
  results?: {
    counts: Record<string, number>;
    success_rate: number;
    target_state?: string;
    total_shots?: number;
    execution_time: number;
  };
}

const HardwareInterface = () => {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('ibm-quantum-api-key') || "";
  });
  const [instance, setInstance] = useState(() => {
    return localStorage.getItem('ibm-quantum-instance') || "ibm-q/open/main";
  });
  const [targetState, setTargetState] = useState("11");
  const [shots, setShots] = useState(1024);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [hardwareInfo, setHardwareInfo] = useState<IBMHardwareInfo | null>(() => {
    const stored = localStorage.getItem('ibm-quantum-hardware-info');
    return stored ? JSON.parse(stored) : null;
  });
  const [jobResult, setJobResult] = useState<IBMJobResult | null>(null);
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem('ibm-quantum-connected') === 'true';
  });
  const [queueStartTime, setQueueStartTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8087";

  // Persist API key and instance to localStorage when they change
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('ibm-quantum-api-key', apiKey);
    } else {
      localStorage.removeItem('ibm-quantum-api-key');
    }
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('ibm-quantum-instance', instance);
  }, [instance]);

  // Persist connection status to localStorage
  useEffect(() => {
    localStorage.setItem('ibm-quantum-connected', isConnected.toString());
    if (!isConnected) {
      localStorage.removeItem('ibm-quantum-hardware-info');
    }
  }, [isConnected]);

  // Persist hardware info to localStorage
  useEffect(() => {
    if (hardwareInfo) {
      localStorage.setItem('ibm-quantum-hardware-info', JSON.stringify(hardwareInfo));
    } else {
      localStorage.removeItem('ibm-quantum-hardware-info');
    }
  }, [hardwareInfo]);

  // Update current time every second to refresh queue time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Helper function to format elapsed time
  const formatElapsedTime = (startTime: Date): string => {
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const connectToIBM = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your IBM Quantum API key",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      console.log(`🚀 API Call: POST ${API_BASE}/hardware/connect`);
      const response = await fetch(`${API_BASE}/hardware/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          instance: instance
        }),
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status}`);
      }

      const data: IBMHardwareInfo = await response.json();
      console.log(`✅ Connected to IBM Quantum:`, data);
      setHardwareInfo(data);
      setIsConnected(true);
      
      toast({
        title: "Connected to IBM Quantum",
        description: `Successfully connected to ${data.backend_name} with ${data.num_qubits} qubits`,
      });
    } catch (error: any) {
      console.error("IBM connection failed:", error);
      toast({
        title: "Connection Failed",
        description: "Could not connect to IBM Quantum. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const runGroverOnIBM = async () => {
    if (!isConnected || !hardwareInfo) {
      toast({
        title: "Not Connected",
        description: "Please connect to IBM Quantum first",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      console.log(`🚀 API Call: POST ${API_BASE}/hardware/run-grover`);
      const response = await fetch(`${API_BASE}/hardware/run-grover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_state: targetState,
          shots: shots,
          api_key: apiKey,
          instance: instance
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
        
        // Handle specific HTTP status codes
        if (response.status === 429) {
          toast({
            title: "Instance Time Limit Exceeded",
            description: "Your IBM Quantum instance has reached its time limit. Contact your administrator or try again later.",
            variant: "destructive",
          });
          return;
        } else if (response.status === 409) {
          toast({
            title: "Account Usage Limits",
            description: "Your account may have reached usage limits. Check your IBM Quantum dashboard.",
            variant: "destructive",
          });
          return;
        } else if (response.status === 401) {
          toast({
            title: "Authentication Failed",
            description: "Please check your API key and instance configuration.",
            variant: "destructive",
          });
          return;
        } else if (response.status === 402) {
          toast({
            title: "Insufficient Credits",
            description: "Your IBM Quantum account has insufficient credits.",
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(errorData.detail || `Execution failed: ${response.status}`);
      }

      const data: IBMJobResult = await response.json();
      console.log(`✅ Grover job submitted:`, data);
      setJobResult(data);
      
      // Set queue start time based on job creation date
      const creationDate = new Date(data.creation_date);
      setQueueStartTime(creationDate);
      
      toast({
        title: "Job Submitted",
        description: `Grover circuit submitted to ${hardwareInfo.backend_name}. Job ID: ${data.job_id}`,
      });

      // Start polling for results if job is queued
      if (data.status === "QUEUED" || data.status === "RUNNING") {
        pollJobStatus(data.job_id);
      }
    } catch (error: any) {
      console.error("Grover execution failed:", error);
      toast({
        title: "Execution Failed",
        description: error.message || "Could not run Grover circuit on IBM hardware. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE}/hardware/job-status/${jobId}`, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "instance": instance
          }
        });
        
        if (response.ok) {
          const data: IBMJobResult = await response.json();
          setJobResult(data);
          
          if (data.status === "DONE" || data.status === "COMPLETED") {
            setQueueStartTime(null); // Clear queue tracking when complete
            // Compute success rate from counts and current targetState
            let computedSuccessRate = 0;
            if (data.results && data.results.counts) {
              const totalShots = data.results.total_shots || Object.values(data.results.counts).reduce((a, b) => a + b, 0);
              const successCount = data.results.counts[targetState] || 0;
              computedSuccessRate = totalShots > 0 ? (successCount / totalShots) * 100 : 0;
            }
            toast({
              title: "Job Completed",
              description: `Grover circuit finished with ${computedSuccessRate.toFixed(1)}% success rate`,
            });
            return;
          } else if (data.status === "ERROR" || data.status === "CANCELLED" || data.status === "FAILED") {
            setQueueStartTime(null); // Clear queue tracking on failure
            toast({
              title: "Job Failed",
              description: `Job ${data.status.toLowerCase()}. Please try again.`,
              variant: "destructive",
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error polling job status:", error);
      }
      
      // Continue polling every 10 seconds
      setTimeout(poll, 10000);
    };
    
    poll();
  };

  const disconnect = () => {
    setIsConnected(false);
    setHardwareInfo(null);
    setJobResult(null);
    setQueueStartTime(null);
    
    // Clear connection data from localStorage
    localStorage.removeItem('ibm-quantum-connected');
    localStorage.removeItem('ibm-quantum-hardware-info');
    
    toast({
      title: "Disconnected",
      description: "Disconnected from IBM Quantum",
    });
  };
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
          Quantum Hardware Interface
        </h2>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Understanding quantum hardware and connecting to real IBM quantum computers to run Grover's algorithm.
        </p>
      </div>

      {/* About IBM Quantum Hardware */}
      <Card className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-slate-600">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center">
            <Cpu className="mr-3 h-6 w-6 text-pink-400" />
            About Quantum Hardware
          </CardTitle>
          <CardDescription className="text-slate-300">
            Physical systems like superconducting circuits, trapped ions, or photonic systems that implement qubits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-orange-300">Superconducting Qubits</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>• Operate at near absolute zero (15 millikelvin)</li>
                <li>• Gate times: ~20-100 nanoseconds</li>
                <li>• Coherence times: ~100 microseconds</li>
                <li>• Controlled via microwave pulses</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-cyan-300">Cloud Access</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>• Queue-based job submission</li>
                <li>• Multiple backend options</li>
                <li>• Real-time calibration data</li>
                <li>• Error mitigation techniques</li>
              </ul>
            </div>
          </div>
          
          <Alert className="border-blue-400/50 bg-blue-600/10">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-200">
              <strong>Real Hardware Benefits:</strong> Experience quantum decoherence, noise, and the current 
              state of NISQ (Noisy Intermediate-Scale Quantum) devices. Results may vary from perfect 
              simulators due to real-world quantum effects.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* IBM Quantum Connection - MOVED TO MIDDLE */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center">
            <div className="flex items-center gap-2">
              <Key className="h-6 w-6 text-orange-400" />
              IBM Quantum Connection
              {isConnected && (
                <CheckCircle className="h-5 w-5 text-green-400" />
              )}
            </div>
          </CardTitle>
          <div className="flex items-center justify-between">
            <CardDescription className="text-slate-300">
              Connect to IBM's quantum computing cloud service
            </CardDescription>
            {isConnected && (
              <Badge variant="outline" className="border-green-400/50 text-green-300">
                <Wifi className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-slate-300">IBM Quantum API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your IBM Quantum API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-slate-900/50 border-orange-400/30 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instance" className="text-slate-300">Instance</Label>
                  <Input
                    id="instance"
                    placeholder="ibm-q/open/main"
                    value={instance}
                    onChange={(e) => setInstance(e.target.value)}
                    className="bg-slate-900/50 border-orange-400/30 text-slate-100"
                  />
                </div>
              </div>
              <Button 
                onClick={connectToIBM} 
                disabled={isConnecting || !apiKey.trim()}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isConnecting ? (
                  <>
                    <Server className="h-4 w-4 mr-2 animate-pulse" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    Connect to IBM Quantum
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connection Status - GREEN when connected */}
              <div className="p-4 rounded-lg border border-green-400/30 bg-green-600/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-green-300 font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Connected to {hardwareInfo?.backend_name}
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={disconnect}
                    className="border-red-400/30 text-red-300 hover:bg-red-600/10"
                  >
                    Disconnect
                  </Button>
                </div>
                {hardwareInfo && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-slate-300">
                    <div><span className="text-green-300">Qubits:</span> {hardwareInfo.num_qubits}</div>
                    <div><span className="text-green-300">Status:</span> {hardwareInfo.operational ? 'Online' : 'Offline'}</div>
                    <div><span className="text-green-300">Queue:</span> {hardwareInfo.pending_jobs} jobs</div>
                    <div><span className="text-green-300">Version:</span> {hardwareInfo.backend_version}</div>
                  </div>
                )}
              </div>

              {/* 2-Qubit Grover Circuit Configuration */}
              <div className="space-y-4">
                <h4 className="text-orange-300 font-medium flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Run 2-Qubit Grover Circuit
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-state" className="text-slate-300">Target State</Label>
                    <select
                      id="target-state"
                      value={targetState}
                      onChange={(e) => setTargetState(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-orange-400/30 rounded-md text-slate-100"
                    >
                      <option value="00">|00⟩</option>
                      <option value="01">|01⟩</option>
                      <option value="10">|10⟩</option>
                      <option value="11">|11⟩</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shots" className="text-slate-300">Number of Shots</Label>
                    <Input
                      id="shots"
                      type="number"
                      min="1"
                      max="8192"
                      value={shots}
                      onChange={(e) => setShots(parseInt(e.target.value))}
                      className="bg-slate-900/50 border-orange-400/30 text-slate-100"
                    />
                  </div>
                </div>
                <Button 
                  onClick={runGroverOnIBM} 
                  disabled={isRunning}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isRunning ? (
                    <>
                      <Server className="h-4 w-4 mr-2 animate-pulse" />
                      Running on Quantum Hardware...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Run Grover on IBM Quantum
                    </>
                  )}
                </Button>
              </div>

              {/* Job Results */}
              {jobResult && (
                <div className="p-4 rounded-lg border border-blue-400/30 bg-blue-600/10">
                  <h4 className="text-blue-300 font-medium mb-3 flex items-center justify-between">
                    Job Status
                    {queueStartTime && (jobResult.status === "QUEUED" || jobResult.status === "RUNNING") && (
                      <span className="text-xs text-slate-400">⏱️ Real-time tracking</span>
                    )}
                  </h4>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between">
                      <span>Job ID:</span>
                      <span className="font-mono text-xs">{jobResult.job_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge 
                        variant="outline"
                        className={
                          (jobResult.status === "DONE" || jobResult.status === "COMPLETED") ? "border-green-400/50 text-green-300" :
                          jobResult.status === "RUNNING" ? "border-yellow-400/50 text-yellow-300" :
                          (jobResult.status === "ERROR" || jobResult.status === "FAILED" || jobResult.status === "CANCELLED") ? "border-red-400/50 text-red-300" :
                          "border-blue-400/50 text-blue-300"
                        }
                      >
                        {jobResult.status}
                      </Badge>
                    </div>
                    {queueStartTime && (jobResult.status === "QUEUED" || jobResult.status === "RUNNING") && (
                      <div className="flex justify-between" key={currentTime.getTime()}>
                        <span>Queue Time:</span>
                        <span className="font-mono text-sm text-yellow-300 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatElapsedTime(queueStartTime)}
                          <div className="w-2 h-2 bg-yellow-400 rounded-full ml-2 animate-pulse"></div>
                        </span>
                      </div>
                    )}
                    {jobResult.queue_position !== undefined && (
                      <div className="flex justify-between">
                        <span>Queue Position:</span>
                        <span>{jobResult.queue_position}</span>
                      </div>
                    )}
                    {jobResult.results && (
                      <div className="mt-4 space-y-2">
                        <h5 className="text-blue-300 font-medium">Results</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Success Rate: {jobResult.results.success_rate.toFixed(1)}%</div>
                          <div>Execution Time: {jobResult.results.execution_time}ms</div>
                          {jobResult.results.target_state && (
                            <div>Target State: |{jobResult.results.target_state}⟩</div>
                          )}
                          {jobResult.results.total_shots && (
                            <div>Total Shots: {jobResult.results.total_shots}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-medium">Measurement Counts:</span>
                          <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                            {Object.entries(jobResult.results.counts).map(([state, count]) => (
                              <div key={state} className="flex justify-between">
                                <span>|{state}⟩:</span>
                                <span>{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Histogram Visualization */}
                        <div className="mt-4">
                          <span className="text-sm font-medium">Histogram:</span>
                          <div className="space-y-2 mt-2">
                            {(() => {
                              const total = jobResult.results.total_shots || Object.values(jobResult.results.counts).reduce((a, b) => a + b, 0);
                              const target = jobResult.results.target_state;
                              return Object.entries(jobResult.results.counts)
                                .sort(([, a], [, b]) => b - a)
                                .map(([state, count]) => {
                                  const percentage = (count / total) * 100;
                                  const isTarget = state === target;
                                  return (
                                    <div key={state} className="space-y-1">
                                      <div className="flex justify-between items-center">
                                        <span className={`font-mono ${isTarget ? 'text-green-400 font-bold' : 'text-slate-300'}`}>|{state}⟩ {isTarget && '(TARGET)'}</span>
                                        <span className={`text-xs ${isTarget ? 'text-green-300' : 'text-slate-400'}`}>{count} ({percentage.toFixed(1)}%)</span>
                                      </div>
                                      <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div
                                          className={
                                            isTarget
                                              ? 'bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300'
                                              : 'bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-300'
                                          }
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                });
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quantum Hardware Technologies - Compact Panel */}
      <Card className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-slate-600">
        <CardHeader>
          <CardTitle className="text-slate-100">Quantum Hardware Technologies</CardTitle>
          <CardDescription className="text-slate-300">
            Comparison of leading quantum computing platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Superconducting Qubits */}
            <div className="space-y-3 p-4 rounded-lg border border-blue-400/20 bg-blue-600/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-5 w-5 text-blue-400" />
                  <h4 className="font-semibold text-blue-300">Superconducting Qubits</h4>
                </div>
                <Badge variant="outline" className="border-blue-400/50 text-blue-300">
                  IBM & Google
                </Badge>
              </div>
              <p className="text-sm text-slate-400">Josephson junctions at millikelvin temperatures</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Temp:</span>
                  <span className="text-blue-300">~15 mK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gate:</span>
                  <span className="text-blue-300">20-100 ns</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coherence:</span>
                  <span className="text-blue-300">~100 μs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Control:</span>
                  <span className="text-blue-300">Microwave</span>
                </div>
              </div>
            </div>

            {/* Trapped Ions */}
            <div className="space-y-3 p-4 rounded-lg border border-purple-400/20 bg-purple-600/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Atom className="h-5 w-5 text-purple-400" />
                  <h4 className="font-semibold text-purple-300">Trapped Ions</h4>
                </div>
                <Badge variant="outline" className="border-purple-400/50 text-purple-300">
                  IonQ & Honeywell
                </Badge>
              </div>
              <p className="text-sm text-slate-400">Individual ions trapped by electromagnetic fields</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Temp:</span>
                  <span className="text-purple-300">Room temp</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gate:</span>
                  <span className="text-purple-300">10-100 μs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coherence:</span>
                  <span className="text-purple-300">~1 minute</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Control:</span>
                  <span className="text-purple-300">Laser</span>
                </div>
              </div>
            </div>

            {/* Photonic Systems */}
            <div className="space-y-3 p-4 rounded-lg border border-cyan-400/20 bg-cyan-600/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-cyan-400" />
                  <h4 className="font-semibold text-cyan-300">Photonic Systems</h4>
                </div>
                <Badge variant="outline" className="border-cyan-400/50 text-cyan-300">
                  Xanadu & PsiQ
                </Badge>
              </div>
              <p className="text-sm text-slate-400">Quantum information encoded in light particles</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Temp:</span>
                  <span className="text-cyan-300">Room temp</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gate:</span>
                  <span className="text-cyan-300">ps to ns</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Decoherence:</span>
                  <span className="text-cyan-300">Minimal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Advantage:</span>
                  <span className="text-cyan-300">Network ready</span>
                </div>
              </div>
            </div>

            {/* Neutral Atoms */}
            <div className="space-y-3 p-4 rounded-lg border border-green-400/20 bg-green-600/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Network className="h-5 w-5 text-green-400" />
                  <h4 className="font-semibold text-green-300">Neutral Atoms</h4>
                </div>
                <Badge variant="outline" className="border-green-400/50 text-green-300">
                  QuEra & Pasqal
                </Badge>
              </div>
              <p className="text-sm text-slate-400">Cold neutral atoms trapped in optical tweezers</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Temp:</span>
                  <span className="text-green-300">μK range</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Scalability:</span>
                  <span className="text-green-300">High</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Connectivity:</span>
                  <span className="text-green-300">Flexible</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applications:</span>
                  <span className="text-green-300">Optimization</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HardwareInterface;