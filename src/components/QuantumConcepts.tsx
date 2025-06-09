import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Atom, Zap, Network, Binary, Target } from "lucide-react";

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
    }
  ];

  const algorithms = [
    {
      name: "Grover's Algorithm",
      purpose: "Database Search",
      advantage: "Quadratic speedup - √N vs N",
      description: "Searches unsorted databases faster than classical algorithms",
      links: [
        { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/Grover%27s_algorithm" },
        { name: "IBM Qiskit", url: "https://github.com/Qiskit/textbook/blob/main/notebooks/ch-algorithms/grover.ipynb" },
        { name: "Original Paper", url: "https://arxiv.org/abs/quant-ph/9605043" }
      ]
    },
    {
      name: "Shor's Algorithm", 
      purpose: "Prime Factorization",
      advantage: "Exponential speedup",
      description: "Could break current encryption methods by efficiently factoring large integers",
      links: [
        { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/Shor%27s_algorithm" },
        { name: "IBM Qiskit", url: "https://github.com/Qiskit/textbook/blob/main/notebooks/ch-algorithms/shor.ipynb" },
        { name: "Original Paper", url: "https://arxiv.org/abs/quant-ph/9508027" }
      ]
    },
    {
      name: "Quantum Fourier Transform",
      purpose: "Signal Processing",
      advantage: "Exponential speedup",
      description: "Foundation for many quantum algorithms",
      links: [
        { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/Quantum_Fourier_transform" },
        { name: "IBM Qiskit", url: "https://github.com/Qiskit/textbook/blob/main/notebooks/ch-algorithms/quantum-fourier-transform.ipynb" },
        { name: "Original Paper", url: "https://arxiv.org/abs/2003.03011" }
      ]
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

      {/* Famous Quantum Algorithms */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Famous Quantum Algorithms</CardTitle>
          <CardDescription className="text-slate-300">
            Quantum algorithms that provide computational advantages over classical methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {algorithms.map((algorithm, index) => (
              <Card key={index} className="bg-slate-900/50 border-slate-600">
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
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-300">{algorithm.advantage}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300">Learn More:</h4>
                    <div className="flex flex-wrap gap-2">
                      {algorithm.links.map((link, linkIndex) => (
                        <a
                          key={linkIndex}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-cyan-300 transition-colors duration-200 border border-slate-600/50 hover:border-cyan-400/50"
                        >
                          {link.name}
                          <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuantumConcepts;
