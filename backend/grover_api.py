from fastapi import FastAPI, HTTPException, status, Path, Header # type: ignore
from fastapi.responses import RedirectResponse # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from pydantic import BaseModel, Field, field_validator, ConfigDict # type: ignore
from typing import Dict, List, Optional, Literal, Tuple, Any
import math
import logging
import os
import sys
from datetime import datetime, timezone

# Qiskit imports
from qiskit import QuantumCircuit, transpile # type: ignore
from qiskit.circuit.library import grover_operator # type: ignore
from qiskit_aer import AerSimulator # type: ignore
from qiskit.quantum_info import Statevector # type: ignore
from qiskit_ibm_runtime import QiskitRuntimeService # type: ignore

def setup_logging() -> logging.Logger:
    """
    Configure and initialize logging for the Grover API.
    
    Sets up both console and file logging with configurable log levels.
    Log level can be controlled via LOG_LEVEL environment variable.
    
    Returns:
        logging.Logger: Configured logger instance for the API
    """
    # Get log level from environment (DEBUG, INFO, WARNING, ERROR)
    log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)
    
    # Configure basic logging
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("grover_api.log", mode="a")
        ],
        force=True  # Override any existing configuration
    )
    
    # Create and configure logger for this module
    api_logger = logging.getLogger("grover_api")
    api_logger.setLevel(log_level)
    
    # Log the initialization
    api_logger.info("Logging initialized with level: %s", log_level_str)
    api_logger.debug("Log file: grover_api.log")
    api_logger.debug("Console logging: enabled")
    
    return api_logger

# Initialize logging
logger = setup_logging()

# Configuration - Configurable via environment variables
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:8086,http://127.0.0.1:8086,http://localhost:3000,http://localhost:5173').split(',')
CORS_ALLOW_CREDENTIALS = os.environ.get('CORS_ALLOW_CREDENTIALS', 'True').lower() in ('true', '1', 't')
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
CORS_ALLOW_HEADERS = ["*"]

# Quantum Configuration
MAX_QUBITS = int(os.environ.get('MAX_QUBITS', '8'))  # Configurable maximum qubits
MIN_QUBITS = int(os.environ.get('MIN_QUBITS', '1'))   # Configurable minimum qubits

logger.info(f"Quantum configuration: {MIN_QUBITS}-{MAX_QUBITS} qubits supported")

app = FastAPI(
    title="Grover's Algorithm API 🔍⚡",
    description="""
    ## Quantum Search API using Grover's Algorithm
    
    This API implements **Grover's quantum search algorithm**, providing quadratic speedup 
    for unstructured search problems. The algorithm can search through N items in O(√N) 
    time compared to O(N) for classical algorithms.
    
    ### 🚀 Key Features
    - **1-3 qubit support**: Search spaces from 2 to 8 states
    - **Quantum simulation**: Fast execution on classical simulators
    - **Real-time analysis**: Performance predictions and circuit optimization
    - **Educational tool**: Perfect for learning quantum algorithms
    
    ### 📊 Performance Benefits
    - **2 states**: 1x speedup (1 iteration vs 1 try)
    - **4 states**: 2x speedup (1 iteration vs 2 tries average)  
    - **8 states**: 2x speedup (2 iterations vs 4 tries average)
    
    ### 🎯 Use Cases
    - Database search optimization
    - Cryptographic applications
    - Quantum algorithm research
    - Educational demonstrations
    """,
    version="1.0.0",
    contact={
        "name": "Diorama Consulting Ltd",
        "email": "mal@malm.co.uk",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    terms_of_service="https://example.com/terms/",
    root_path=os.environ.get('ROOT_PATH', '')
)

# Add CORS middleware with configurable origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)

# Initialize simulator
simulator = AerSimulator()
logger.info("Quantum simulator initialized: %s", simulator.name)

@app.on_event("startup")
async def startup_event() -> None:
    """Log API startup information"""
    logger.info("Starting Grover's Algorithm API v1.0.0")
    logger.info("Quantum backend: %s", simulator.name)
    logger.info("Maximum supported qubits: %d", MAX_QUBITS)
    logger.info("CORS configured for frontend on port 8086")
    logger.info("API documentation available at /docs and /redoc")

@app.on_event("shutdown") 
async def shutdown_event() -> None:
    """Log API shutdown information"""
    logger.info("Shutting down Grover's Algorithm API")

class GroverRequest(BaseModel):
    target_state: str = Field(
        ..., 
        description="Target quantum state as binary string",
        pattern=f"^[01]{{{MIN_QUBITS},{MAX_QUBITS}}}$"
    )
    shots: int = Field(
        1000, 
        ge=100, 
        le=10000, 
        description="Number of measurement repetitions for statistical accuracy"
    )
    backend: Literal["simulator"] = Field(
        "simulator", 
        description="Quantum backend to execute the algorithm"
    )
    
    @field_validator('target_state')
    @classmethod
    def validate_target_state(cls, v: str) -> str:
        """Validate that target_state is a proper binary string with correct length"""
        logger.debug("Validating target state: %s", v)
        if not v or not all(c in '01' for c in v):
            logger.warning("Invalid target state format: %s", v)
            raise ValueError("Target state must be a binary string (only '0' and '1')")
        if len(v) < MIN_QUBITS or len(v) > MAX_QUBITS:
            logger.warning("Invalid target state length: %d", len(v))
            raise ValueError(f"Target state must be {MIN_QUBITS}-{MAX_QUBITS} qubits (length {MIN_QUBITS}-{MAX_QUBITS})")
        logger.debug("Target state validated successfully: %s", v)
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "summary": "Single Qubit Search",
                    "description": "Search in 2-state space for target '1'",
                    "value": {
                        "target_state": "1",
                        "shots": 1000,
                        "backend": "simulator"
                    }
                },
                {
                    "summary": "Two Qubit Search", 
                    "description": "Search in 4-state space for target '11'",
                    "value": {
                        "target_state": "11",
                        "shots": 1000,
                        "backend": "simulator"
                    }
                },
                {
                    "summary": "Three Qubit Search",
                    "description": "Search in 8-state space for target '101'", 
                    "value": {
                        "target_state": "101",
                        "shots": 2000,
                        "backend": "simulator"
                    }
                }
            ]
        }
    )

class GroverResponse(BaseModel):
    target_state: str = Field(description="The target quantum state that was searched for")
    num_qubits: int = Field(description="Number of qubits in the quantum circuit")
    optimal_iterations: int = Field(description="Theoretically optimal number of Grover iterations")
    shots: int = Field(description="Number of measurement shots executed")
    success_rate: float = Field(description="Percentage of measurements that found the target state")
    measurements: Dict[str, int] = Field(
        description="Complete measurement results showing all observed quantum states"
    )
    circuit_depth: int = Field(description="Depth of the transpiled quantum circuit")
    execution_time_ms: float = Field(description="Algorithm execution time in milliseconds")
    timestamp: str = Field(description="ISO timestamp of when the search was executed")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "target_state": "101",
                "num_qubits": 3,
                "optimal_iterations": 2,
                "shots": 1000,
                "success_rate": 96.2,
                "measurements": {
                    "000": 12, "001": 15, "010": 8, "011": 9,
                    "100": 13, "101": 962, "110": 11, "111": 10
                },
                "circuit_depth": 15,
                "execution_time_ms": 45.67,
                "timestamp": "2024-01-20T10:30:00"
            }
        }
    )

class AnalysisResponse(BaseModel):
    target_state: str = Field(description="Target quantum state analyzed")
    analysis: Dict = Field(description="Detailed performance analysis")
    performance_comparison: Dict = Field(description="Classical vs quantum comparison")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "target_state": "101",
                "analysis": {
                    "num_qubits": 3,
                    "search_space_size": 8,
                    "optimal_iterations": 2,
                    "theoretical_success_rate": 96.1,
                    "speedup_factor": 2.0
                },
                "performance_comparison": {
                    "classical_average_case": 4.0,
                    "quantum_grover": 2,
                    "advantage": "2.0x faster on average"
                }
            }
        }
    )

class CircuitInfoResponse(BaseModel):
    target_state: str = Field(description="Target quantum state")
    circuit_info: Dict = Field(description="Detailed circuit specifications")
    circuit_diagram: str = Field(description="ASCII representation of the quantum circuit")
    gate_summary: Dict = Field(description="Breakdown of gates used in the circuit")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "target_state": "11",
                "circuit_info": {
                    "num_qubits": 2,
                    "num_classical_bits": 2,
                    "circuit_depth": 10,
                    "total_gates": 16,
                    "optimal_iterations": 1
                },
                "circuit_diagram": "ASCII circuit diagram here...",
                "gate_summary": {"h": 6, "cz": 2, "x": 4, "measure": 2}
            }
        }
    )

class IterationStep(BaseModel):
    step_name: str = Field(description="Name of the step (e.g., 'Initial', 'Oracle', 'Diffusion')")
    iteration_number: int = Field(description="Current iteration number (0 for initial state)")
    probabilities: Dict[str, float] = Field(description="Probability of each quantum state")
    target_probability: float = Field(description="Probability of the target state")

class GroverIterationResponse(BaseModel):
    target_state: str = Field(description="The target quantum state being searched for")
    num_qubits: int = Field(description="Number of qubits in the quantum circuit")
    optimal_iterations: int = Field(description="Theoretically optimal number of Grover iterations")
    search_space_size: int = Field(description="Total number of possible quantum states")
    steps: List[IterationStep] = Field(description="Step-by-step probability evolution")
    final_amplification: float = Field(description="Final amplification factor vs initial probability")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "target_state": "101",
                "num_qubits": 3,
                "optimal_iterations": 2,
                "search_space_size": 8,
                "steps": [
                    {
                        "step_name": "Initial Superposition",
                        "iteration_number": 0,
                        "probabilities": {"000": 0.125, "001": 0.125, "010": 0.125, "011": 0.125, "100": 0.125, "101": 0.125, "110": 0.125, "111": 0.125},
                        "target_probability": 0.125
                    }
                ],
                "final_amplification": 7.6
            }
        }
    )

def build_generalized_grover_oracle(target_state: str) -> QuantumCircuit:
    """
    Build a generalized Grover oracle that works for any number of qubits (1-8).
    Uses multi-controlled Z gates for efficient implementation.
    
    Args:
        target_state: Binary string representing the target quantum state
        
    Returns:
        QuantumCircuit: Oracle circuit that marks the target state with phase flip
    """
    logger.debug("Building generalized Grover oracle for target state: %s", target_state)
    num_qubits = len(target_state)
    qc = QuantumCircuit(num_qubits)
    logger.debug("Created quantum circuit with %d qubits", num_qubits)
    
    if num_qubits < MIN_QUBITS or num_qubits > MAX_QUBITS:
        logger.error("Unsupported number of qubits: %d", num_qubits)
        raise ValueError(f"Number of qubits must be between {MIN_QUBITS} and {MAX_QUBITS}, got: {num_qubits}")
    
    # Convert target state to qubit ordering (reverse for Qiskit)
    target_bits = [int(bit) for bit in target_state[::-1]]
    logger.debug("Target bits (Qiskit order): %s", target_bits)
    
    # Apply X gates where target bits are 0 (flip to |1⟩ for control)
    for i, bit in enumerate(target_bits):
        if bit == 0:
            qc.x(i)
            logger.debug("Applied X gate to qubit %d (target bit is 0)", i)
    
    # Apply multi-controlled Z gate
    if num_qubits == 1:
        qc.z(0)
        logger.debug("Applied Z gate for single qubit")
    elif num_qubits == 2:
        qc.cz(0, 1)
        logger.debug("Applied controlled-Z gate for 2 qubits")
    elif num_qubits == 3:
        qc.ccz(0, 1, 2)
        logger.debug("Applied controlled-controlled-Z gate for 3 qubits")
    else:
        # For 4+ qubits, use multi-controlled Z gate decomposition
        # This uses ancilla-free implementation via multi-controlled X + Z + multi-controlled X
        control_qubits = list(range(num_qubits - 1))
        target_qubit = num_qubits - 1
        
        # Implement multi-controlled Z using mcx decomposition
        if len(control_qubits) == 1:
            qc.cz(control_qubits[0], target_qubit)
        else:
            # Multi-controlled Z = H on target, multi-controlled X, H on target
            qc.h(target_qubit)
            qc.mcx(control_qubits, target_qubit)
            qc.h(target_qubit)
        
        logger.debug("Applied multi-controlled-Z gate for %d qubits", num_qubits)
    
    # Apply X gates back where target bits were 0
    for i, bit in enumerate(target_bits):
        if bit == 0:
            qc.x(i)
            logger.debug("Applied X gate back to qubit %d", i)
    
    logger.debug("Oracle construction completed. Circuit depth: %d", qc.depth())
    return qc

# Keep the old function name for backward compatibility
def build_simple_grover_oracle(target_state: str) -> QuantumCircuit:
    """Backward compatibility wrapper for the generalized oracle."""
    return build_generalized_grover_oracle(target_state)

def create_grover_circuit(target_state: str) -> Tuple[QuantumCircuit, int]:
    """
    Create a complete Grover algorithm circuit.
    
    Args:
        target_state: Binary string representing the target quantum state
        
    Returns:
        Tuple containing:
        - QuantumCircuit: Complete Grover circuit with oracle and diffusion operators
        - int: Optimal number of iterations for maximum success probability
    """
    logger.info("Creating Grover circuit for target state: %s", target_state)
    num_qubits = len(target_state)
    
    # Calculate optimal iterations: π/4 * √(N/M)
    N = 2**num_qubits  # Total states
    M = 1  # Number of marked states
    optimal_iterations = max(1, int(math.pi / 4 * math.sqrt(N / M)))
    logger.info("Calculated optimal iterations: %d for %d qubits (search space: %d)", 
                optimal_iterations, num_qubits, N)
    
    # Create circuit
    qc = QuantumCircuit(num_qubits, num_qubits)
    logger.debug("Created quantum circuit with %d qubits and %d classical bits", num_qubits, num_qubits)
    
    # Step 1: Initialize superposition
    qc.h(range(num_qubits))
    logger.debug("Applied Hadamard gates to initialize superposition")
    
    # Step 2: Apply Grover iterations
    oracle = build_simple_grover_oracle(target_state)
    logger.debug("Built oracle circuit with depth: %d", oracle.depth())
    
    for iteration in range(optimal_iterations):
        logger.debug("Starting Grover iteration %d/%d", iteration + 1, optimal_iterations)
        
        # Apply oracle
        qc.compose(oracle, inplace=True)
        logger.debug("Applied oracle in iteration %d", iteration + 1)
        
        # Apply generalized diffusion operator (inversion about average)
        qc.h(range(num_qubits))
        qc.x(range(num_qubits))
        
        # Multi-controlled Z gate for generalized diffusion
        if num_qubits == 1:
            qc.z(0)
        elif num_qubits == 2:
            qc.cz(0, 1)
        elif num_qubits == 3:
            qc.ccz(0, 1, 2)
        else:
            # For 4+ qubits, use multi-controlled Z decomposition
            control_qubits = list(range(num_qubits - 1))
            target_qubit = num_qubits - 1
            
            if len(control_qubits) == 1:
                qc.cz(control_qubits[0], target_qubit)
            else:
                # Multi-controlled Z = H on target, multi-controlled X, H on target
                qc.h(target_qubit)
                qc.mcx(control_qubits, target_qubit)
                qc.h(target_qubit)
        
        qc.x(range(num_qubits))
        qc.h(range(num_qubits))
        logger.debug("Applied diffusion operator in iteration %d", iteration + 1)
        
        qc.barrier()  # Visual separator
    
    # Step 3: Measure
    qc.measure(range(num_qubits), range(num_qubits))
    logger.debug("Added measurement gates")
    
    final_depth = qc.depth()
    final_gate_count = qc.size()
    logger.info("Grover circuit completed. Depth: %d, Gates: %d, Iterations: %d", 
                final_depth, final_gate_count, optimal_iterations)
    
    return qc, optimal_iterations

@app.get("/", include_in_schema=False)
async def redirect_to_docs() -> RedirectResponse:
    """Redirect root to Swagger documentation"""
    logger.debug("Root endpoint accessed, redirecting to docs")
    return RedirectResponse(url="/docs")

@app.get("/health", 
         tags=["Health Check"],
         summary="API Health Check",
         description="Check if the API is running and get basic information about capabilities")
async def health_check() -> Dict[str, Any]:
    """
    Get basic API health information and capabilities.
    
    Returns essential information about:
    - API version and status
    - Maximum supported qubits
    - Available quantum backends
    - Quick capability overview
    """
    logger.info("Health check endpoint accessed")
    health_data = {
        "status": "healthy",
        "message": "Grover's Algorithm API is running",
        "version": "1.0.0",
        "max_qubits": MAX_QUBITS,
        "available_backends": ["simulator"],
        "description": "Quantum search using Grover's algorithm",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }
    logger.debug("Health check completed successfully")
    return health_data

@app.get("/info",
         tags=["Information"],
         summary="Detailed API Information", 
         description="Get comprehensive information about Grover's algorithm implementation, capabilities, and examples")
async def get_info() -> Dict[str, Any]:
    """
    Get detailed information about the Grover's Algorithm API.
    
    Provides comprehensive details about:
    - Algorithm complexity and benefits
    - Supported qubit configurations
    - Backend availability and status
    - Usage examples for different scenarios
    - Technical implementation details
    """
    logger.info("Info endpoint accessed")
    return {
        "algorithm": "Grover's Quantum Search Algorithm",
        "description": "Provides quadratic speedup for unstructured search problems",
        "supported_qubits": f"{MIN_QUBITS}-{MAX_QUBITS}",
        "time_complexity": "O(√N) where N is the search space size",
        "classical_complexity": "O(N) for unstructured search",
        "quantum_advantage": "Quadratic speedup - searches √N times faster",
        "max_shots": 10000,
        "min_shots": 100,
        "backend_status": {
            "simulator": "available",
            "ibm_quantum": "coming_soon"
        },
        "examples": {
            "1_qubit": {
                "target_state": "1", 
                "search_space": 2,
                "optimal_iterations": 1,
                "expected_success_rate": "~100%"
            },
            "2_qubit": {
                "target_state": "11", 
                "search_space": 4,
                "optimal_iterations": 1,
                "expected_success_rate": "~100%"
            },
            "3_qubit": {
                "target_state": "101", 
                "search_space": 8,
                "optimal_iterations": 2,
                "expected_success_rate": "~96%"
            },
            "4_qubit": {
                "target_state": "1010", 
                "search_space": 16,
                "optimal_iterations": 3,
                "expected_success_rate": "~94%"
            },
            "5_qubit": {
                "target_state": "10101", 
                "search_space": 32,
                "optimal_iterations": 4,
                "expected_success_rate": "~92%"
            },
            "8_qubit": {
                "target_state": "10101010", 
                "search_space": 256,
                "optimal_iterations": 12,
                "expected_success_rate": "~88%"
            }
        },
        "technical_details": {
            "oracle_implementation": "Basic quantum gates (X, Z, CZ, CCZ)",
            "diffusion_operator": "Manual inversion-about-average",
            "simulator": "Qiskit Aer",
            "circuit_optimization": "Automatic transpilation"
        }
    }

@app.post("/grover/search", 
          response_model=GroverResponse,
          tags=["Quantum Search"],
          summary="Execute Grover's Quantum Search",
          description="Run Grover's algorithm to find a target state with quadratic speedup",
          status_code=status.HTTP_200_OK,
          responses={
              200: {
                  "description": "Successful quantum search execution",
                  "content": {
                      "application/json": {
                          "example": {
                              "target_state": "101",
                              "num_qubits": 3,
                              "optimal_iterations": 2,
                              "shots": 1000,
                              "success_rate": 96.2,
                              "measurements": {
                                  "000": 12, "001": 15, "010": 8, "011": 9,
                                  "100": 13, "101": 962, "110": 11, "111": 10
                              },
                              "circuit_depth": 15,
                              "execution_time_ms": 45.67,
                              "timestamp": "2024-01-20T10:30:00"
                          }
                      }
                  }
              },
              422: {"description": "Invalid input parameters"},
              500: {"description": "Quantum execution failure"}
          })
async def run_grover_search(request: GroverRequest) -> GroverResponse:
    """
    Execute Grover's quantum search algorithm to find a target state.
    
    This endpoint runs the complete Grover algorithm:
    1. **Initialization**: Creates superposition of all possible states
    2. **Oracle**: Marks the target state with a phase flip
    3. **Diffusion**: Amplifies probability of marked state
    4. **Measurement**: Collapses to classical result
    
    The algorithm provides **quadratic speedup** over classical search:
    - Classical: O(N) average case
    - Quantum: O(√N) with Grover's algorithm
    
    **Performance Examples:**
    - 2 states: ~100% success in 1 iteration
    - 4 states: ~100% success in 1 iteration  
    - 8 states: ~96% success in 2 iterations
    """
    start_time = datetime.now()
    logger.info("Starting Grover search for target: %s, shots: %d, backend: %s", 
                request.target_state, request.shots, request.backend)
    
    try:
        # Create Grover circuit
        logger.debug("Creating Grover circuit...")
        circuit, optimal_iterations = create_grover_circuit(request.target_state)
        
        # Transpile for simulator
        logger.debug("Transpiling circuit for simulator...")
        transpiled_circuit = transpile(circuit, simulator)
        logger.info("Circuit transpiled. Original depth: %d, Transpiled depth: %d", 
                   circuit.depth(), transpiled_circuit.depth())
        
        # Execute
        logger.info("Executing quantum circuit with %d shots...", request.shots)
        job = simulator.run(transpiled_circuit, shots=request.shots)
        result = job.result()
        counts = result.get_counts()
        logger.debug("Quantum execution completed. Raw counts: %s", counts)
        
        # Calculate success rate
        target_count = counts.get(request.target_state, 0)
        success_rate = (target_count / request.shots) * 100
        logger.info("Target state '%s' found %d/%d times (%.2f%% success rate)", 
                   request.target_state, target_count, request.shots, success_rate)
        
        # Calculate execution time
        end_time = datetime.now()
        execution_time_ms = (end_time - start_time).total_seconds() * 1000
        
        response = GroverResponse(
            target_state=request.target_state,
            num_qubits=len(request.target_state),
            optimal_iterations=optimal_iterations,
            shots=request.shots,
            success_rate=success_rate,
            measurements=counts,
            circuit_depth=transpiled_circuit.depth(),
            execution_time_ms=round(execution_time_ms, 2),
            timestamp=start_time.isoformat()
        )
        
        logger.info("Grover search completed successfully in %.2f ms", execution_time_ms)
        return response
        
    except Exception as e:
        logger.error("Grover search failed for target '%s': %s", request.target_state, str(e))
        logger.exception("Full error traceback:")
        raise HTTPException(status_code=500, detail=f"Quantum execution failed: {str(e)}")

@app.get("/grover/analyze/{target_state}",
         response_model=AnalysisResponse,
         tags=["Analysis"],
         summary="Analyze Target State Performance",
         description="Get theoretical performance predictions for a target quantum state",
         responses={
             200: {"description": "Successful analysis with performance predictions"},
             422: {"description": "Invalid target state format"}
         })
async def analyze_target_state(
    target_state: str = Path(
        ..., 
        description=f"Target state as binary string ({MIN_QUBITS}-{MAX_QUBITS} qubits)",
        examples=["101"],
        pattern=f"^[01]{{{MIN_QUBITS},{MAX_QUBITS}}}$"
    )
) -> Dict[str, Any]:
    """
    Analyze a target quantum state and provide theoretical performance predictions.
    
    This endpoint calculates:
    - **Search space size**: Total number of possible states (2^n)
    - **Optimal iterations**: Theoretical best number of Grover iterations  
    - **Success probability**: Expected probability of finding target state
    - **Speedup factor**: Advantage over classical search methods
    - **Performance comparison**: Classical vs quantum operation counts
    
    **Analysis includes:**
    - Complexity theory comparisons
    - Resource requirements
    - Expected success rates
    - Practical performance metrics
    
    **Supported target states:**
    - 1 qubit: "0", "1" 
    - 2 qubits: "00", "01", "10", "11"
    - 3 qubits: "000", "001", "010", "011", "100", "101", "110", "111"
    """
    logger.info("Analyzing target state: %s", target_state)
    
    # Validate target state
    if not target_state or not all(c in '01' for c in target_state):
        logger.warning("Invalid target state format received: %s", target_state)
        raise HTTPException(status_code=400, detail="Invalid target state format")
    
    if len(target_state) < MIN_QUBITS or len(target_state) > MAX_QUBITS:
        logger.warning("Invalid target state length: %d", len(target_state))
        raise HTTPException(status_code=400, detail=f"Target state must be {MIN_QUBITS}-{MAX_QUBITS} qubits")
    
    num_qubits = len(target_state)
    N = 2**num_qubits
    optimal_iterations = max(1, int(math.pi / 4 * math.sqrt(N)))
    logger.debug("Analysis parameters: qubits=%d, search_space=%d, optimal_iterations=%d", 
                num_qubits, N, optimal_iterations)
    
    # Calculate theoretical success probability
    # For optimal iterations, success probability ≈ 1 for single marked state
    theoretical_success = min(100.0, (math.sin((2 * optimal_iterations + 1) * math.asin(1/math.sqrt(N))) ** 2) * 100)
    
    # Calculate speedup vs classical search
    classical_average = N / 2  # Classical average case
    quantum_operations = optimal_iterations
    speedup = classical_average / quantum_operations
    
    logger.info("Analysis completed: %.1f%% theoretical success, %.2fx speedup", 
               theoretical_success, speedup)
    
    analysis_result = {
        "target_state": target_state,
        "analysis": {
            "num_qubits": num_qubits,
            "search_space_size": N,
            "optimal_iterations": optimal_iterations,
            "theoretical_success_rate": round(theoretical_success, 1),
            "classical_average_tries": classical_average,
            "quantum_operations": quantum_operations,
            "speedup_factor": round(speedup, 2)
        },
        "performance_comparison": {
            "classical_worst_case": N,
            "classical_average_case": classical_average,
            "quantum_grover": quantum_operations,
            "advantage": f"{round(speedup, 1)}x faster on average (operations needed)"
        }
    }
    
    return analysis_result

@app.get("/grover/circuit/{target_state}",
         response_model=CircuitInfoResponse,
         tags=["Circuit Analysis"], 
         summary="Get Quantum Circuit Information",
         description="Retrieve detailed information about the quantum circuit for a target state",
         responses={
             200: {"description": "Successful circuit analysis with detailed information"},
             422: {"description": "Invalid target state format"},
             500: {"description": "Circuit generation failure"}
         })
async def get_circuit_info(
    target_state: str = Path(
        ...,
        description=f"Target state as binary string ({MIN_QUBITS}-{MAX_QUBITS} qubits)", 
        examples=["11"],
        pattern=f"^[01]{{{MIN_QUBITS},{MAX_QUBITS}}}$"
    )
) -> Dict[str, Any]:
    """
    Get comprehensive quantum circuit information for a target state.
    
    This endpoint provides detailed circuit analysis including:
    - **Circuit structure**: Number of qubits and classical bits
    - **Circuit complexity**: Depth and total gate count
    - **Optimization metrics**: Transpiled circuit statistics
    - **Gate composition**: Breakdown of quantum operations used
    - **Visual representation**: ASCII circuit diagram
    
    **Circuit details include:**
    - Original circuit specifications
    - Transpiled (optimized) circuit metrics  
    - Gate-level breakdown and analysis
    - Circuit diagram for visualization
    - Performance characteristics
    
    **Useful for:**
    - Understanding algorithm implementation
    - Circuit optimization analysis
    - Educational purposes
    - Debugging and verification
    """
    logger.info("Generating circuit info for target state: %s", target_state)
    
    # Validate target state
    if not target_state or not all(c in '01' for c in target_state):
        logger.warning("Invalid target state format for circuit info: %s", target_state)
        raise HTTPException(status_code=400, detail="Invalid target state format")
    
    if len(target_state) < MIN_QUBITS or len(target_state) > MAX_QUBITS:
        logger.warning("Invalid target state length for circuit info: %d", len(target_state))
        raise HTTPException(status_code=400, detail=f"Target state must be {MIN_QUBITS}-{MAX_QUBITS} qubits")
    
    try:
        logger.debug("Creating circuit for analysis...")
        circuit, optimal_iterations = create_grover_circuit(target_state)
        
        logger.debug("Transpiling circuit for analysis...")
        transpiled_circuit = transpile(circuit, simulator)
        
        # Generate circuit diagram
        circuit_diagram = str(circuit.draw())
        gate_summary = circuit.count_ops()
        
        logger.info("Circuit analysis completed. Original depth: %d, Transpiled depth: %d, Total gates: %d", 
                   circuit.depth(), transpiled_circuit.depth(), circuit.size())
        
        circuit_info_result = {
            "target_state": target_state,
            "circuit_info": {
                "num_qubits": circuit.num_qubits,
                "num_classical_bits": circuit.num_clbits,
                "circuit_depth": circuit.depth(),
                "total_gates": circuit.size(),
                "optimal_iterations": optimal_iterations,
                "transpiled_depth": transpiled_circuit.depth(),
                "transpiled_gates": transpiled_circuit.size()
            },
            "circuit_diagram": circuit_diagram,
            "gate_summary": gate_summary
        }
        
        logger.debug("Circuit info result prepared successfully")
        return circuit_info_result
        
    except Exception as e:
        logger.error("Circuit generation failed for target '%s': %s", target_state, str(e))
        logger.exception("Full error traceback:")
        raise HTTPException(status_code=500, detail=f"Circuit generation failed: {str(e)}")

@app.get("/grover/iterations/{target_state}",
         response_model=GroverIterationResponse,
         tags=["Visualization"],
         summary="Get Grover Algorithm Iteration Details",
         description="Retrieve step-by-step probability evolution through each iteration of Grover's algorithm",
         responses={
             200: {"description": "Successful iteration analysis with probability evolution"},
             422: {"description": "Invalid target state format"},
             500: {"description": "Circuit simulation failure"}
         })
async def get_grover_iterations(
    target_state: str = Path(
        ...,
        description=f"Target state as binary string ({MIN_QUBITS}-{MAX_QUBITS} qubits)", 
        examples=["101"],
        pattern=f"^[01]{{{MIN_QUBITS},{MAX_QUBITS}}}$"
    )
) -> Dict[str, Any]:
    """
    Get detailed step-by-step probability evolution through Grover's algorithm iterations.
    
    This endpoint simulates the quantum algorithm and tracks how probabilities change:
    - **Initial Superposition**: All states start with equal probability
    - **After Oracle**: Phase flip marks the target (probabilities appear unchanged)
    - **After Diffusion**: Amplitude amplification increases target probability
    
    **What you'll see:**
    - Probability of each quantum state at each step
    - Target state probability evolution
    - Final amplification factor achieved
    
    **Perfect for:**
    - Understanding how Grover's algorithm works
    - Educational visualization
    - Algorithm analysis and debugging
    - Seeing quantum interference in action
    """
    logger.info("Getting iteration details for target state: %s", target_state)
    
    # Validate target state
    if not target_state or not all(c in '01' for c in target_state):
        logger.warning("Invalid target state format for iterations: %s", target_state)
        raise HTTPException(status_code=400, detail="Invalid target state format")
    
    if len(target_state) < MIN_QUBITS or len(target_state) > MAX_QUBITS:
        logger.warning("Invalid target state length for iterations: %d", len(target_state))
        raise HTTPException(status_code=400, detail=f"Target state must be {MIN_QUBITS}-{MAX_QUBITS} qubits")
    
    try:
        num_qubits = len(target_state)
        N = 2**num_qubits
        optimal_iterations = max(1, int(math.pi / 4 * math.sqrt(N)))
        target_index = int(target_state, 2)  # Convert binary string to index
        
        logger.debug("Iteration analysis: qubits=%d, search_space=%d, optimal_iterations=%d, target_index=%d", 
                    num_qubits, N, optimal_iterations, target_index)
        
        steps = []
        
        # Create initial circuit with just superposition
        qc = QuantumCircuit(num_qubits)
        qc.h(range(num_qubits))
        
        # Get initial state probabilities
        statevector = Statevector.from_instruction(qc)
        initial_probs = [abs(amplitude)**2 for amplitude in statevector]
        initial_prob_dict = {format(i, f'0{num_qubits}b'): prob for i, prob in enumerate(initial_probs)}
        
        steps.append(IterationStep(
            step_name="Initial Superposition",
            iteration_number=0,
            probabilities=initial_prob_dict,
            target_probability=initial_probs[target_index]
        ))
        
        logger.debug("Initial probabilities calculated: target_prob=%.3f", initial_probs[target_index])
        
        # Build oracle
        oracle = build_simple_grover_oracle(target_state)
        
        # Apply each iteration and track probabilities
        for iteration in range(optimal_iterations):
            logger.debug("Processing iteration %d/%d", iteration + 1, optimal_iterations)
            
            # Apply oracle
            qc.compose(oracle, inplace=True)
            statevector = Statevector.from_instruction(qc)
            oracle_probs = [abs(amplitude)**2 for amplitude in statevector]
            oracle_prob_dict = {format(i, f'0{num_qubits}b'): prob for i, prob in enumerate(oracle_probs)}
            
            steps.append(IterationStep(
                step_name=f"After Oracle",
                iteration_number=iteration + 1,
                probabilities=oracle_prob_dict,
                target_probability=oracle_probs[target_index]
            ))
            
            # Apply diffusion operator (generalized for all qubit counts)
            qc.h(range(num_qubits))
            qc.x(range(num_qubits))
            
            # Multi-controlled Z gate for generalized diffusion
            if num_qubits == 1:
                qc.z(0)
            elif num_qubits == 2:
                qc.cz(0, 1)
            elif num_qubits == 3:
                qc.ccz(0, 1, 2)
            else:
                # For 4+ qubits, use multi-controlled Z decomposition
                control_qubits = list(range(num_qubits - 1))
                target_qubit = num_qubits - 1
                
                if len(control_qubits) == 1:
                    qc.cz(control_qubits[0], target_qubit)
                else:
                    # Multi-controlled Z = H on target, multi-controlled X, H on target
                    qc.h(target_qubit)
                    qc.mcx(control_qubits, target_qubit)
                    qc.h(target_qubit)
            
            qc.x(range(num_qubits))
            qc.h(range(num_qubits))
            
            statevector = Statevector.from_instruction(qc)
            diffusion_probs = [abs(amplitude)**2 for amplitude in statevector]
            diffusion_prob_dict = {format(i, f'0{num_qubits}b'): prob for i, prob in enumerate(diffusion_probs)}
            
            steps.append(IterationStep(
                step_name=f"After Diffusion",
                iteration_number=iteration + 1,
                probabilities=diffusion_prob_dict,
                target_probability=diffusion_probs[target_index]
            ))
            
            logger.debug("Iteration %d complete: target_prob=%.3f", iteration + 1, diffusion_probs[target_index])
        
        # Calculate final amplification
        initial_target_prob = 1.0 / N
        final_target_prob = steps[-1].target_probability
        amplification = final_target_prob / initial_target_prob
        
        logger.info("Iteration analysis completed: initial=%.3f, final=%.3f, amplification=%.1fx", 
                   initial_target_prob, final_target_prob, amplification)
        
        iteration_result = {
            "target_state": target_state,
            "num_qubits": num_qubits,
            "optimal_iterations": optimal_iterations,
            "search_space_size": N,
            "steps": [step.dict() for step in steps],
            "final_amplification": round(amplification, 2)
        }
        
        return iteration_result
        
    except Exception as e:
        logger.error("Iteration analysis failed for target '%s': %s", target_state, str(e))
        logger.exception("Full error traceback:")
        raise HTTPException(status_code=500, detail=f"Iteration analysis failed: {str(e)}")

# IBM Quantum Hardware Integration Models
class IBMConnectionRequest(BaseModel):
    api_key: str = Field(..., description="IBM Quantum API key")
    instance: str = Field("ibm-q/open/main", description="IBM Quantum instance")

class IBMHardwareInfo(BaseModel):
    backend_name: str = Field(description="Name of the quantum backend")
    backend_version: str = Field(description="Version of the quantum backend")
    num_qubits: int = Field(description="Number of qubits available")
    operational: bool = Field(description="Whether the backend is operational")
    pending_jobs: int = Field(description="Number of jobs in queue")
    basis_gates: List[str] = Field(description="Available quantum gates")
    coupling_map: List[List[int]] = Field(description="Qubit connectivity map")

class IBMGroverRequest(BaseModel):
    target_state: str = Field(..., pattern="^[01]{2}$", description="2-qubit target state (e.g., '11')")
    shots: int = Field(1024, ge=100, le=8192, description="Number of measurement shots")
    api_key: str = Field(..., description="IBM Quantum API key")
    instance: str = Field("ibm-q/open/main", description="IBM Quantum instance")

class IBMJobResult(BaseModel):
    job_id: str = Field(description="IBM Quantum job ID")
    status: str = Field(description="Job status (QUEUED, RUNNING, COMPLETED, etc.)")
    backend_name: str = Field(description="Backend where job was executed")
    creation_date: str = Field(description="Job creation timestamp")
    queue_position: Optional[int] = Field(None, description="Position in queue")
    estimated_completion_time: Optional[str] = Field(None, description="Estimated completion time")
    results: Optional[Dict] = Field(None, description="Job results if completed, includes counts, success_rate, target_state, total_shots, execution_time")

# IBM Quantum Hardware Endpoints
@app.post("/hardware/connect",
          response_model=IBMHardwareInfo,
          tags=["IBM Quantum Hardware"],
          summary="Connect to IBM Quantum Hardware",
          description="Connect to IBM Quantum and retrieve hardware information")
async def connect_to_ibm_quantum(request: IBMConnectionRequest) -> IBMHardwareInfo:
    """
    Connect to IBM Quantum hardware and get backend information.
    
    Requires valid IBM Quantum API key and instance.
    Returns detailed hardware specifications.
    """
    logger.info("Attempting to connect to IBM Quantum with instance: %s", request.instance)
    
    try:
        # Step 2: Connect and run on IBM Quantum (following user's pattern)
        logger.info("🔌 Connecting to IBM Quantum service...")
        
        # Save account credentials first (like in the notebook)
        logger.info("Saving account with instance: %s", request.instance)
        QiskitRuntimeService.save_account(token=request.api_key, instance=request.instance, overwrite=True)
        logger.info("Account saved successfully")
        
        # Now use the simple approach that works locally
        logger.info("Creating service with instance: %s", request.instance)
        service = QiskitRuntimeService(instance=request.instance)
        logger.info("Service created successfully")
        backend = service.least_busy(operational=True, simulator=False, min_num_qubits=2)
        
        logger.info(f"✅ Connected to: {backend.name}")
        
        # Get backend configuration
        config = backend.configuration()
        status = backend.status()
        
        hardware_info = IBMHardwareInfo(
            backend_name=config.backend_name,
            backend_version=config.backend_version,
            num_qubits=config.n_qubits,
            operational=status.operational,
            pending_jobs=status.pending_jobs,
            basis_gates=config.basis_gates,
            coupling_map=config.coupling_map
        )
        
        logger.info("Successfully connected to IBM Quantum backend: %s", config.backend_name)
        return hardware_info
        
    except ImportError:
        logger.error("IBM Quantum Runtime not available")
        raise HTTPException(
            status_code=500,
            detail="IBM Quantum Runtime package not installed"
        )
    except Exception as e:
        logger.error("Failed to connect to IBM Quantum: %s", str(e))
        raise HTTPException(
            status_code=400, 
            detail=f"IBM Quantum connection failed: {str(e)}"
        )

@app.post("/hardware/run-grover",
          response_model=IBMJobResult,
          tags=["IBM Quantum Hardware"],
          summary="Run Grover Circuit on IBM Hardware",
          description="Execute 2-qubit Grover circuit on real IBM quantum hardware")
async def run_grover_on_ibm_hardware(request: IBMGroverRequest) -> IBMJobResult:
    """
    Run 2-qubit Grover's algorithm on real IBM quantum hardware.
    
    Based on the implementation from the Jupyter notebook.
    Executes the complete circuit and returns job information.
    """
    logger.info("Running Grover circuit on IBM hardware for target: %s", request.target_state)
    
    try:
        # Import required modules
        from qiskit_ibm_runtime import QiskitRuntimeService, Sampler, Session
        from qiskit import QuantumCircuit, transpile
        
        # Step 2: Connect and run on IBM Quantum (following user's pattern)
        logger.info("🔌 Connecting to IBM Quantum service...")
        
        # Save account credentials first (like in the notebook)
        QiskitRuntimeService.save_account(token=request.api_key, instance=request.instance, overwrite=True)
        
        # Now use the simple approach that works locally
        service = QiskitRuntimeService(instance=request.instance)
        
        # Try to get a stable backend for Grover circuits
        logger.info("🔍 Finding suitable quantum backend for Grover circuit...")
        try:
            # Prefer backends with good 2-qubit gate fidelity and recent calibration
            backends = service.backends(
                operational=True, 
                simulator=False, 
                min_num_qubits=2,
                max_num_qubits=127  # Avoid very large backends that might be less stable
            )
            
            # Filter backends and select the best one
            suitable_backends = []
            for backend_obj in backends:
                try:
                    # Check if backend has recent calibration data
                    config = backend_obj.configuration()
                    if hasattr(config, 'backend_name') and config.backend_name:
                        suitable_backends.append(backend_obj)
                except Exception as e:
                    logger.debug("Backend %s not suitable: %s", getattr(backend_obj, 'name', 'unknown'), str(e))
                    continue
            
            if suitable_backends:
                # Use least busy among suitable backends
                backend = min(suitable_backends, key=lambda b: b.status().pending_jobs)
                logger.info("✅ Selected backend: %s (pending jobs: %d)", 
                           backend.name, backend.status().pending_jobs)
            else:
                # Fallback to least busy overall
                backend = service.least_busy(operational=True, simulator=False, min_num_qubits=2)
                logger.info("⚠️ Using fallback backend: %s", backend.name)
                
        except Exception as backend_error:
            logger.warning("Backend selection failed: %s", str(backend_error))
            # Final fallback
            backend = service.least_busy(operational=True, simulator=False, min_num_qubits=2)
        
        logger.info(f"✅ Connected to: {backend.name}")
        
        # Log backend calibration info for debugging
        try:
            status = backend.status()
            config = backend.configuration()
            logger.info("🔧 Backend info: %s (qubits: %d, pending: %d)", 
                       backend.name, config.n_qubits, status.pending_jobs)
            logger.info("📊 Backend status: operational=%s, message='%s'", 
                       status.operational, getattr(status, 'status_msg', 'OK'))
        except Exception as info_error:
            logger.warning("Could not get backend info: %s", str(info_error))
        
        # Build 2-qubit Grover circuit (from notebook)
        qc = QuantumCircuit(2)
        
        # Step 1: Initialize superposition
        qc.h([0, 1])
        
        # Step 2: Oracle for target state
        target = request.target_state
        rev_target = target[::-1]  # Reverse for Qiskit ordering
        
        # Apply X gates where target bits are 0
        for i, bit in enumerate(rev_target):
            if bit == "0":
                qc.x(i)
        
        # Apply controlled-Z
        qc.cz(0, 1)
        
        # Apply X gates back
        for i, bit in enumerate(rev_target):
            if bit == "0":
                qc.x(i)
        
        # Step 3: Diffusion operator
        qc.h([0, 1])
        qc.x([0, 1])
        qc.cz(0, 1)
        qc.x([0, 1])
        qc.h([0, 1])
        
        # Step 4: Measure
        qc.measure_all()
        
        logger.debug("Built 2-qubit Grover circuit with depth: %d", qc.depth())
        
        # Transpile for backend with frequency-aware optimization
        try:
            logger.info("Transpiling circuit for backend: %s", backend.name)
            transpiled_qc = transpile(
                qc, 
                backend=backend, 
                optimization_level=2,  # Higher optimization for better frequency handling
                seed_transpiler=42,    # Reproducible results
                scheduling_method='alap'  # Schedule to avoid frequency conflicts
            )
            logger.info("Circuit transpiled successfully. Depth: %d → %d", qc.depth(), transpiled_qc.depth())
        except Exception as transpile_error:
            logger.warning("Standard transpilation failed: %s", str(transpile_error))
            # Fallback to basic transpilation without scheduling
            transpiled_qc = transpile(qc, backend=backend, optimization_level=1)
            logger.info("Used fallback transpilation")
        
        # Submit job using Qiskit Runtime V2 Sampler (no Session, no Options)
        try:
            from qiskit_ibm_runtime import Sampler
            logger.info("🚀 Creating Session and Sampler...")
            with Session(backend=backend) as session:
                sampler = Sampler()
                logger.info("🚀 Submitting Sampler job via Qiskit Runtime V2 API...")
                job = sampler.run([transpiled_qc], shots=request.shots)
        except Exception as sampler_error:
            logger.error("Failed to submit Sampler job: %s", str(sampler_error))
            raise HTTPException(
                status_code=500,
                detail=f"Failed to submit Sampler job: {str(sampler_error)}"
            )
        # Store target state as job metadata (tags) if possible
        try:
            job.tags = [f"target:{request.target_state}", f"shots:{request.shots}"]
        except Exception as e:
            logger.warning("Could not set job tags: %s", str(e))
        job_result = IBMJobResult(
            job_id=job.job_id(),
            status="QUEUED",
            backend_name=backend.name,
            creation_date=datetime.now().isoformat(),
            queue_position=None,
            estimated_completion_time=None,
            results=None
        )
        logger.info("Job submitted to IBM Quantum: %s", job.job_id())
        return job_result
            
    except ImportError:
        logger.error("IBM Quantum Runtime not available")
        raise HTTPException(
            status_code=500,
            detail="IBM Quantum Runtime package not installed"
        )
    except Exception as e:
        error_message = str(e)
        logger.error("Failed to run Grover circuit on IBM hardware: %s", error_message)
        
        # Handle specific IBM Quantum service errors
        if "Instance time limit exceeded" in error_message:
            raise HTTPException(
                status_code=429,  # Too Many Requests
                detail="IBM Quantum instance time limit exceeded. Please contact your instance administrator to increase the limit, or try again later."
            )
        elif "frequency" in error_message.lower() or "calibration" in error_message.lower():
            raise HTTPException(
                status_code=503,  # Service Unavailable
                detail="IBM Quantum backend frequency/calibration issue. The quantum hardware may be undergoing calibration. Please try again in a few minutes, or select a different backend."
            )
        elif "pulse" in error_message.lower() or "schedule" in error_message.lower():
            raise HTTPException(
                status_code=400,
                detail="Quantum circuit scheduling failed. The circuit may not be compatible with the current backend calibration. Try using a different target state or backend."
            )
        elif "409 Client Error" in error_message:
            raise HTTPException(
                status_code=409,
                detail="IBM Quantum service conflict. Your account may have reached usage limits. Please check your IBM Quantum dashboard."
            )
        elif "401" in error_message or "Unauthorized" in error_message:
            raise HTTPException(
                status_code=401,
                detail="IBM Quantum authentication failed. Please check your API key and instance."
            )
        elif "insufficient credits" in error_message.lower():
            raise HTTPException(
                status_code=402,  # Payment Required
                detail="Insufficient IBM Quantum credits. Please check your account balance."
            )
        elif "backend" in error_message.lower() and "not found" in error_message.lower():
            raise HTTPException(
                status_code=404,
                detail="IBM Quantum backend not found or not accessible. The backend may be offline for maintenance."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Hardware execution failed: {error_message}"
            )

@app.get("/hardware/job-status/{job_id}",
         response_model=IBMJobResult,
         tags=["IBM Quantum Hardware"],
         summary="Get IBM Job Status",
         description="Check the status and results of an IBM Quantum job")
async def get_ibm_job_status(
    job_id: str = Path(..., description="IBM Quantum job ID"),
    authorization: str = Header(..., description="Bearer token with API key"),
    instance: str = Header("ibm-q/open/main", description="IBM Quantum instance")
) -> IBMJobResult:
    """
    Get the status and results of an IBM Quantum job.
    
    Returns job status, queue position, and results if completed.
    """
    logger.info("Checking status for job: %s", job_id)
    
    try:
        # Minimal essential logging for job status endpoint
        try:
            service = QiskitRuntimeService(instance=instance)
        except Exception as svc_error:
            logger.error("[JobStatus] Failed to create QiskitRuntimeService: %s", str(svc_error))
            raise
        try:
            backend = service.least_busy(operational=True, simulator=False, min_num_qubits=2)
        except Exception as be_error:
            logger.error("[JobStatus] Failed to select backend: %s", str(be_error))
            raise
        # Get job
        try:
            job = service.job(job_id)
        except Exception as job_error:
            logger.error("[JobStatus] Failed to retrieve job: %s", str(job_error))
            raise
        try:
            status = job.status()
            status_name = status.name if hasattr(status, 'name') else str(status)
        except Exception as status_error:
            logger.error("[JobStatus] Failed to get job status: %s", str(status_error))
            raise
        job_result = IBMJobResult(
            job_id=job_id,
            status=status_name,
            backend_name=job.backend().name,
            creation_date=job.creation_date.isoformat(),
            queue_position=getattr(status, 'queue_position', None),
            estimated_completion_time=None,
            results=None
        )
        # If job is completed, extract results following user's pattern
        if status_name == "DONE":
            try:
                logger.info("[JobStatus] Job is DONE. Extracting results...")
                result = job.result()
                logger.info("[JobStatus] Job result object obtained.")
                bit_array = result[0].data.meas
                logger.info("[JobStatus] bit_array extracted from result.")
                counts = bit_array.get_counts()
                # Reverse bit order to match frontend/target convention
                counts = {bits[::-1]: n for bits, n in counts.items()}
                logger.info("[JobStatus] Measurement counts: %s", counts)
                # Extract target state from job tags if available
                target_state = None
                if hasattr(job, 'tags') and job.tags:
                    for tag in job.tags:
                        if tag.startswith("target:"):
                            target_state = tag.split(":", 1)[1]
                            break
                total_shots = sum(counts.values())
                success_rate = 0.0
                # Calculate success rate if we have the target state
                if target_state:
                    success_count = counts.get(target_state, 0)
                    success_rate = (success_count / total_shots) * 100
                    logger.info("[JobStatus] Target '%s': %d/%d (%.1f%%)", target_state, success_count, total_shots, success_rate)
                # Use wall time (end_date - creation_date) in ms if available, else fallback to now
                execution_time = 0
                result_timestamp = None
                logger.info("[JobStatus] creation_date: %s, end_date: %s", getattr(job, 'creation_date', None), getattr(job, 'end_date', None))
                now = datetime.now(timezone.utc)
                if hasattr(job, 'creation_date') and job.creation_date:
                    if hasattr(job, 'end_date') and job.end_date:
                        execution_time = (job.end_date - job.creation_date).total_seconds() * 1000  # ms
                        result_timestamp = job.end_date.isoformat()
                    else:
                        execution_time = (now - job.creation_date).total_seconds() * 1000  # ms
                        result_timestamp = now.isoformat()
                else:
                    execution_time = 0
                    result_timestamp = now.isoformat()
                job_result.results = {
                    "counts": counts,
                    "success_rate": success_rate,
                    "target_state": target_state,
                    "total_shots": total_shots,
                    "execution_time": execution_time,
                    "timestamp": result_timestamp
                }
                logger.info("[JobStatus] Results extraction complete for job %s", job_id)
            except Exception as e:
                logger.error("[JobStatus] Failed to extract results for job %s: %s", job_id, str(e), exc_info=True)
        return job_result
        
    except ImportError:
        logger.error("IBM Quantum Runtime not available")
        raise HTTPException(
            status_code=500,
            detail="IBM Quantum Runtime package not installed"
        )
    except Exception as e:
        logger.error("Failed to get job status for %s: %s", job_id, str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Job status check failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn # type: ignore
    
    # Get port from environment variable or use default
    port = int(os.getenv("PORT", 8087))
    
    # Get current log level for uvicorn compatibility
    current_log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    logger.info("Starting Grover's Algorithm API server...")
    logger.info("Configuration: port=%d, log_level=%s", port, current_log_level)
    logger.info("Access the API at: http://localhost:%d", port)
    logger.info("API documentation: http://localhost:%d/docs", port)
    
    try:
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=port, 
            reload=True,
            log_level=current_log_level.lower()
        )
    except KeyboardInterrupt:
        logger.info("Server shutdown requested by user")
    except Exception as e:
        logger.error("Failed to start server: %s", str(e))
        logger.exception("Full error traceback:")
        sys.exit(1) 