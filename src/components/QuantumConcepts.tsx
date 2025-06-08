
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Atom, Zap, Network, Binary, Target, Cpu } from "lucide-react";

const QuantumConcepts = () => {
  const concepts = [
    {
      icon: <Atom className="h-8 w-8 text-blue-400" />,
      title: "Quantum Bits (Qubits)",
      description: "Unlike classical bits that are either 0 or 1, qubits can exist in superposition - simultaneously 0 and 1 until measured.",
      details: [
        "Can represent multiple states simultaneously",
        "Foundation of quantum computing power",
        "Collapse to definite states when measured"
      ],
      color: "blue"
    },
    {
      icon: <Zap className="h-8 w-8 text-purple-400" />,
      title: "Superposition",
      description: "The quantum property that allows qubits to exist in multiple states at once, exponentially increasing computational possibilities.",
      details: [
        "Enables parallel computation",
        "Creates quantum advantage",
        "Fragile - easily destroyed by interference"
      ],
      color: "purple"
    },
    {
      icon: <Network className="h-8 w-8 text-cyan-400" />,
      title: "Entanglement",
      description: "When qubits become correlated, measuring one instantly affects the other, regardless of distance.",
      details: [
        "Creates quantum correlations",
        "Enables quantum communication",
        "Key for many quantum algorithms"
      ],
      color: "cyan"
    },
    {
      icon: <Binary className="h-8 w-8 text-green-400" />,
      title: "Quantum Gates",
      description: "Operations that manipulate qubits, similar to logic gates in classical computing but with quantum properties.",
      details: [
        "Hadamard gate creates superposition",
        "CNOT gate creates entanglement",
        "Pauli gates perform rotations"
      ],
      color: "green"
    },
    {
      icon: <Target className="h-8 w-8 text-orange-400" />,
      title: "Measurement",
      description: "The process of observing a quantum state, which collapses superposition into a definite classical state.",
      details: [
        "Destroys quantum superposition",
        "Provides probabilistic results",
        "Multiple measurements give statistics"
      ],
      color: "orange"
    },
    {
      icon: <Cpu className="h-8 w-8 text-pink-400" />,
      title: "Quantum Hardware",
      description: "Physical systems like superconducting circuits, trapped ions, or photonic systems that implement qubits.",
      details: [
        "IBM Quantum systems use superconducting qubits",
        "Require extreme cooling (~0.01K)",
        "Accessed via cloud APIs like Qiskit"
      ],
      color: "pink"
    }
  ];

  const algorithms = [
    {
      name: "Grover's Algorithm",
      purpose: "Database Search",
      advantage: "Quadratic speedup - √N vs N",
      description: "Searches unsorted databases faster than classical algorithms"
    },
    {
      name: "Shor's Algorithm", 
      purpose: "Prime Factorization",
      advantage: "Exponential speedup",
      description: "Could break current encryption methods"
    },
    {
      name: "Quantum Fourier Transform",
      purpose: "Signal Processing",
      advantage: "Exponential speedup",
      description: "Foundation for many quantum algorithms"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Fundamental Quantum Computing Concepts
        </h2>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Understanding these core principles is essential for grasping how quantum computers work and why they're revolutionary
        </p>
      </div>

      {/* Core Concepts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {concepts.map((concept, index) => (
          <Card key={index} className="bg-slate-800/50 backdrop-blur-sm border-slate-700 hover:border-slate-600 transition-all duration-300 hover:scale-105">
            <CardHeader className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-${concept.color}-600/20`}>
                  {concept.icon}
                </div>
                <CardTitle className="text-slate-100">{concept.title}</CardTitle>
              </div>
              <CardDescription className="text-slate-300">
                {concept.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {concept.details.map((detail, idx) => (
                  <li key={idx} className="text-sm text-slate-400 flex items-start">
                    <span className={`w-1.5 h-1.5 rounded-full bg-${concept.color}-400 mt-2 mr-3 flex-shrink-0`}></span>
                    {detail}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="bg-slate-700" />

      {/* Famous Quantum Algorithms */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-center bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
          Famous Quantum Algorithms
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {algorithms.map((algorithm, index) => (
            <Card key={index} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-slate-600">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-100">{algorithm.name}</CardTitle>
                  <Badge variant="outline" className="border-cyan-400/50 text-cyan-300">
                    {algorithm.purpose}
                  </Badge>
                </div>
                <CardDescription className="text-slate-300">
                  {algorithm.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-300">{algorithm.advantage}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Qiskit Integration Info */}
      <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm border-blue-600/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center">
            <Cpu className="mr-3 h-6 w-6 text-blue-400" />
            Interfacing with Quantum Hardware
          </CardTitle>
          <CardDescription className="text-slate-200">
            Modern quantum computing platforms like IBM's Qiskit provide cloud access to real quantum processors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-300">IBM Qiskit Features:</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Cloud access to quantum processors</li>
                <li>• Quantum circuit composer</li>
                <li>• Noise simulation and error mitigation</li>
                <li>• Real-time queue monitoring</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-300">Hardware Types:</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Superconducting qubits (IBM, Google)</li>
                <li>• Trapped ions (IonQ, Honeywell)</li>
                <li>• Photonic systems (Xanadu)</li>
                <li>• Neutral atoms (QuEra)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuantumConcepts;
