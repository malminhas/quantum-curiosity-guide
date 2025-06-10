import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Zap, Cpu, BookOpen, PlayCircle, BarChart3, CircuitBoard } from "lucide-react";
import QubitVisualization from "@/components/QubitVisualization";
import GroverInterface from "@/components/GroverInterface";
import QuantumConcepts from "@/components/QuantumConcepts";
import CircuitVisualization from "@/components/CircuitVisualization";
// import HardwareInterface from "@/components/HardwareInterface";

const Index = () => {
  const [activeTab, setActiveTab] = useState("concepts");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22m36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center space-x-2 bg-blue-600/20 rounded-full px-4 py-2 backdrop-blur-sm">
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="text-blue-200 text-sm font-medium">Quantum Computing Demystified</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white">
              Quantum Computing
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto">
              Explore the fascinating world of quantum computing, understand qubits, and experience real quantum algorithms
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => setActiveTab("concepts")}
              >
                <BookOpen className="mr-2 h-5 w-5" />
                Learn Concepts
              </Button>
              <Button 
                variant={activeTab === "grover" ? "default" : "outline"}
                size="lg"
                className={
                  activeTab === "grover"
                    ? "bg-green-600 hover:bg-green-700 text-white border-green-500"
                    : "border-purple-400/50 text-purple-200 hover:bg-purple-600/20"
                }
                onClick={() => setActiveTab("grover")}
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Try Grover's Algorithm
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid grid-cols-5 w-full max-w-3xl bg-slate-800/50 backdrop-blur-sm">
              <TabsTrigger value="concepts" className="data-[state=active]:bg-blue-600">
                <BookOpen className="mr-2 h-4 w-4" />
                Concepts
              </TabsTrigger>
              <TabsTrigger value="qubits" className="data-[state=active]:bg-purple-600">
                <Cpu className="mr-2 h-4 w-4" />
                Qubits
              </TabsTrigger>
              <TabsTrigger value="circuits" className="data-[state=active]:bg-cyan-600">
                <CircuitBoard className="mr-2 h-4 w-4" />
                Circuits
              </TabsTrigger>
              <TabsTrigger value="hardware" className="data-[state=active]:bg-orange-600">
                <Zap className="mr-2 h-4 w-4" />
                Hardware
              </TabsTrigger>
              <TabsTrigger value="grover" className="data-[state=active]:bg-green-600">
                <BarChart3 className="mr-2 h-4 w-4" />
                Grover's
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="concepts" className="space-y-6">
            <QuantumConcepts />
          </TabsContent>

          <TabsContent value="qubits" className="space-y-6">
            <QubitVisualization />
          </TabsContent>

          <TabsContent value="circuits" className="space-y-6">
            <CircuitVisualization />
          </TabsContent>

          <TabsContent value="hardware" className="space-y-6">
            <div className="text-center py-8">
              <p className="text-slate-400">Hardware interface temporarily disabled</p>
            </div>
          </TabsContent>

          <TabsContent value="grover" className="space-y-6">
            <GroverInterface />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900/80 backdrop-blur-sm border-t border-slate-700">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center space-x-6">
              <Badge variant="outline" className="border-blue-400/50 text-blue-300">
                Quantum Education
              </Badge>
              <Badge variant="outline" className="border-purple-400/50 text-purple-300">
                Interactive Learning
              </Badge>
              <Badge variant="outline" className="border-cyan-400/50 text-cyan-300">
                Real Algorithms
              </Badge>
            </div>
            <Separator className="bg-slate-700" />
            <p className="text-slate-400">
              Built with modern web technologies and integrated with quantum computing APIs
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
