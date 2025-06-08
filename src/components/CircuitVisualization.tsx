import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CircuitBoard, Play, RotateCcw, Zap } from "lucide-react";

const CircuitVisualization = () => {
  const [selectedGates, setSelectedGates] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const gates = [
    { name: "H", symbol: "H", description: "Hadamard Gate - Creates superposition", color: "blue" },
    { name: "X", symbol: "X", description: "Pauli-X Gate - Bit flip (NOT)", color: "red" },
    { name: "Y", symbol: "Y", description: "Pauli-Y Gate - Bit and phase flip", color: "green" },
    { name: "Z", symbol: "Z", description: "Pauli-Z Gate - Phase flip", color: "purple" },
    { name: "CNOT", symbol: "⊕", description: "Controlled-NOT - Creates entanglement", color: "cyan" },
    { name: "T", symbol: "T", description: "T Gate - π/4 phase rotation", color: "orange" },
  ];

  const addGate = (gateName: string) => {
    setSelectedGates([...selectedGates, gateName]);
  };

  const clearCircuit = () => {
    setSelectedGates([]);
  };

  const simulateCircuit = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 2000);
  };

  const exampleCircuits = [
    {
      name: "Bell State",
      gates: ["H", "CNOT"],
      description: "Creates maximum entanglement between two qubits",
      result: "(|00⟩ + |11⟩)/√2"
    },
    {
      name: "Grover Oracle",
      gates: ["H", "Z", "H"],
      description: "Marks target state in Grover's algorithm",
      result: "Flips amplitude of target state"
    },
    {
      name: "Quantum Fourier Transform",
      gates: ["H", "T", "H", "T"],
      description: "Essential for many quantum algorithms",
      result: "Extracts frequency information"
    }
  ];

  const loadExampleCircuit = (gates: string[]) => {
    setSelectedGates(gates);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
          Quantum Circuit Builder
        </h2>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Build and visualize quantum circuits using fundamental quantum gates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gate Palette */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <CircuitBoard className="mr-2 h-5 w-5 text-cyan-400" />
              Quantum Gates
            </CardTitle>
            <CardDescription className="text-slate-300">
              Click to add gates to your circuit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {gates.map((gate, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={`h-16 border-${gate.color}-400/50 text-${gate.color}-200 hover:bg-${gate.color}-600/20 flex flex-col`}
                  onClick={() => addGate(gate.name)}
                >
                  <span className="text-lg font-bold">{gate.symbol}</span>
                  <span className="text-xs">{gate.name}</span>
                </Button>
              ))}
            </div>
            <Separator className="bg-slate-600" />
            <div className="space-y-2">
              {gates.map((gate, index) => (
                <div key={index} className="text-xs text-slate-400">
                  <span className={`text-${gate.color}-300 font-medium`}>{gate.name}:</span> {gate.description}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Circuit Visualization */}
        <Card className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-slate-100">Quantum Circuit</CardTitle>
                <CardDescription className="text-slate-300">
                  Your circuit with {selectedGates.length} gates
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={simulateCircuit}
                  disabled={selectedGates.length === 0 || isSimulating}
                  className="border-green-400/50 text-green-200 hover:bg-green-600/20"
                >
                  <Play className="mr-1 h-3 w-3" />
                  {isSimulating ? "Running..." : "Simulate"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCircuit}
                  className="border-red-400/50 text-red-200 hover:bg-red-600/20"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900/50 p-6 rounded-lg min-h-[200px]">
              {selectedGates.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  Add quantum gates to build your circuit
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Qubit lines */}
                  <div className="relative">
                    {/* Qubit 0 */}
                    <div className="flex items-center space-x-4 mb-8">
                      <span className="text-slate-300 w-8">|0⟩</span>
                      <div className="flex-1 h-px bg-slate-600 relative">
                        {selectedGates.map((gate, index) => (
                          <div
                            key={index}
                            className="absolute w-12 h-12 border-2 border-blue-400 bg-slate-800 rounded flex items-center justify-center text-blue-300 font-bold transform -translate-y-1/2"
                            style={{ left: `${index * 80 + 20}px` }}
                          >
                            {gates.find(g => g.name === gate)?.symbol}
                          </div>
                        ))}
                      </div>
                      <span className="text-slate-300 w-16">Measure</span>
                    </div>

                    {/* Qubit 1 (if CNOT is present) */}
                    {selectedGates.includes("CNOT") && (
                      <div className="flex items-center space-x-4">
                        <span className="text-slate-300 w-8">|0⟩</span>
                        <div className="flex-1 h-px bg-slate-600 relative">
                          {selectedGates.map((gate, index) => (
                            gate === "CNOT" && (
                              <div
                                key={index}
                                className="absolute w-4 h-4 border-2 border-cyan-400 bg-cyan-400 rounded-full transform -translate-y-1/2"
                                style={{ left: `${index * 80 + 44}px` }}
                              />
                            )
                          ))}
                        </div>
                        <span className="text-slate-300 w-16">Measure</span>
                      </div>
                    )}
                  </div>

                  {/* Circuit Information */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
                    <Badge variant="outline" className="border-blue-400/50 text-blue-300">
                      Gates: {selectedGates.length}
                    </Badge>
                    <Badge variant="outline" className="border-purple-400/50 text-purple-300">
                      Qubits: {selectedGates.includes("CNOT") ? 2 : 1}
                    </Badge>
                    <Badge variant="outline" className="border-green-400/50 text-green-300">
                      Depth: {selectedGates.length}
                    </Badge>
                    {isSimulating && (
                      <Badge className="bg-yellow-600/20 text-yellow-300 animate-pulse">
                        <Zap className="mr-1 h-3 w-3" />
                        Simulating...
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Example Circuits */}
        <Card className="lg:col-span-3 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Famous Quantum Circuits</CardTitle>
            <CardDescription className="text-slate-300">
              Load pre-built circuits used in quantum computing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {exampleCircuits.map((circuit, index) => (
                <Card key={index} className="bg-slate-900/50 border-slate-600">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-slate-200">{circuit.name}</CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      {circuit.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {circuit.gates.map((gate, gateIndex) => (
                        <Badge key={gateIndex} variant="outline" className="text-xs border-slate-500 text-slate-300">
                          {gate}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Result: {circuit.result}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadExampleCircuit(circuit.gates)}
                      className="w-full border-cyan-400/50 text-cyan-200 hover:bg-cyan-600/20"
                    >
                      Load Circuit
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CircuitVisualization;
